/**
 * RC5.6 — field-level authorization tests.
 *
 * Proves Policy-driven DTO projection, masking, patch rejection before
 * mutation, sensitive access audit evidence, KYC omission, and fail-closed
 * behavior without changing the RBAC catalog or Policy Engine.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Rc5FieldPermissions,
  authorizeFieldPatch,
  projectFields,
  type ApplicationContext,
  type FieldReadRule,
} from "@afh/application";
import {
  InMemorySecurityAuditStore,
  createIdentityFoundation,
  type PolicyEngine,
  type PolicyPrincipal,
  type PolicyResource,
} from "@afh/identity";
import {
  createRecordPaymentHandler,
  projectInvoiceFields,
  projectPaymentFields,
  type FinanceHandlerDeps,
  type RecordPaymentPayload,
} from "@afh/finance-application";
import type { Invoice, InvoiceLine, Payment } from "@afh/finance";
import {
  AuthorizationError,
  CommandId,
  CorrelationId,
  ok,
  type Command,
  type PlatformError,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";

const COMPANY = "company-1";

const unitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(unitOfWork);
  },
};

function principal(permissionCodes: readonly string[]): PolicyPrincipal {
  return {
    userId: "user-1",
    companyId: COMPANY,
    roles: [
      { roleCode: "finance_manager", scopeType: "company", scopeId: null },
    ],
    permissionCodes,
  };
}

function testContext(
  permissionCodes: readonly string[],
  options: { readonly policyEngine?: PolicyEngine } = {},
): {
  readonly ctx: ApplicationContext;
  readonly auditStore: InMemorySecurityAuditStore;
  readonly audit: ReturnType<typeof createIdentityFoundation>["audit"];
} {
  const auditStore = new InMemorySecurityAuditStore();
  const identity = createIdentityFoundation({ auditStore });
  return {
    auditStore,
    audit: identity.audit,
    ctx: {
      correlationId: "rc56-field-test",
      userId: "user-1",
      companyId: COMPANY,
      branchId: null,
      principal: principal(permissionCodes),
      metadata: {},
      clock: identity.clock,
      signal: null,
      policyEngine: options.policyEngine ?? identity.policyEngine,
      workflow: null,
      approval: null,
      rules: null,
      unitOfWork,
      outboxDispatcher: null,
    },
  };
}

function resource(type: string, id: string): PolicyResource {
  return {
    type,
    id,
    companyId: COMPANY,
    ownerUserId: null,
    organizationId: null,
    branchId: null,
  };
}

function invoice(): Invoice {
  const now = new Date().toISOString();
  return {
    id: "invoice-1",
    companyId: COMPANY,
    number: "INV-1",
    status: "issued",
    currencyCode: "PKR",
    customerId: "customer-1",
    organizationId: null,
    billToAddressId: null,
    issuedAt: now,
    dueAt: now,
    subtotal: { currencyCode: "PKR", amountMinor: 10_000n },
    taxTotal: { currencyCode: "PKR", amountMinor: 1_500n },
    total: { currencyCode: "PKR", amountMinor: 11_500n },
    createdAt: now,
    updatedAt: now,
  };
}

function invoiceLine(): InvoiceLine {
  return {
    id: "line-1",
    invoiceId: "invoice-1",
    companyId: COMPANY,
    lineNumber: 1,
    description: "Restricted financial line",
    quantity: 1,
    unitCode: "EA",
    unitAmount: { currencyCode: "PKR", amountMinor: 10_000n },
    lineAmount: { currencyCode: "PKR", amountMinor: 10_000n },
    taxCategoryId: null,
    productId: null,
    variantId: null,
  };
}

function payment(): Payment {
  const now = new Date().toISOString();
  return {
    id: "payment-1",
    companyId: COMPANY,
    status: "captured",
    amount: { currencyCode: "PKR", amountMinor: 11_500n },
    method: {
      methodId: "bank-account-12345678",
      kind: "bank_transfer",
      label: "Operating account",
    },
    invoiceId: "invoice-1",
    payerCustomerId: "customer-1",
    payerOrganizationId: null,
    externalRef: "gateway-reference-87654321",
    correlationId: "corr-1",
    recordedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("RC5.6 finance field projection", () => {
  it("omits invoice totals and line amounts when finance.costs.read is denied", async () => {
    const { ctx, audit, auditStore } = testContext([
      "finance.invoices.read",
    ]);
    const projected = await projectInvoiceFields(
      ctx,
      audit,
      resource("invoice", "invoice-1"),
      invoice(),
      [invoiceLine()],
    );

    assert.ok(projected.ok);
    assert.equal("subtotal" in projected.value.invoice, false);
    assert.equal("taxTotal" in projected.value.invoice, false);
    assert.equal("total" in projected.value.invoice, false);
    assert.equal("unitAmount" in projected.value.lines[0]!, false);
    assert.equal("lineAmount" in projected.value.lines[0]!, false);
    assert.equal(projected.value.invoice.number, "INV-1");
    const fieldAudits = auditStore.records.filter(
      (record) => record.action === "field.read",
    );
    assert.equal(fieldAudits.length, 5);
    for (const record of fieldAudits) {
      assert.deepEqual(Object.keys(record.details).sort(), [
        "field",
        "permission",
        "reasonCode",
        "sensitivity",
      ]);
      assert.equal(JSON.stringify(record.details).includes("11500"), false);
    }
  });

  it("returns sensitive finance fields only when Policy allows the field permission", async () => {
    const { ctx, audit } = testContext([
      "finance.invoices.read",
      Rc5FieldPermissions.FinanceCostsRead,
    ]);
    const projected = await projectInvoiceFields(
      ctx,
      audit,
      resource("invoice", "invoice-1"),
      invoice(),
      [invoiceLine()],
    );

    assert.ok(projected.ok);
    assert.equal(projected.value.invoice.total?.amountMinor, 11_500n);
    assert.equal(projected.value.lines[0]?.unitAmount?.amountMinor, 10_000n);
  });

  it("masks bank/payment identifiers when full bank access is denied", async () => {
    const { ctx, audit } = testContext(["finance.payments.read"]);
    const projected = await projectPaymentFields(
      ctx,
      audit,
      resource("payment", "payment-1"),
      payment(),
    );

    assert.ok(projected.ok);
    assert.match(projected.value.method?.methodId ?? "", /^•+5678$/);
    assert.match(projected.value.externalRef ?? "", /^•+4321$/);
    assert.equal(projected.value.amount.amountMinor, 11_500n);
  });

  it("returns full bank/payment identifiers only with explicit Policy permission", async () => {
    const { ctx, audit } = testContext([
      "finance.payments.read",
      Rc5FieldPermissions.FinanceBankAccountsRead,
    ]);
    const projected = await projectPaymentFields(
      ctx,
      audit,
      resource("payment", "payment-1"),
      payment(),
    );

    assert.ok(projected.ok);
    assert.equal(projected.value.method?.methodId, "bank-account-12345678");
    assert.equal(projected.value.externalRef, "gateway-reference-87654321");
  });
});

describe("RC5.6 KYC and fail-closed projection", () => {
  type KycDto = {
    readonly assetId: string;
    readonly displayName: string;
    readonly nationalId: string;
  };

  const kycRules: readonly FieldReadRule<KycDto>[] = [
    {
      field: "nationalId",
      permission: Rc5FieldPermissions.DamKycAssetsRead,
      sensitivity: "restricted",
      denied: "omit",
    },
  ];

  it("omits KYC fields when dam.kyc_assets.read is missing", async () => {
    const { ctx } = testContext(["dam.assets.read"]);
    const projected = await projectFields(
      ctx,
      resource("kyc_asset", "kyc-1"),
      {
        assetId: "kyc-1",
        displayName: "Identity document",
        nationalId: "35202-1234567-1",
      },
      kycRules,
    );

    assert.ok(projected.ok);
    assert.equal("nationalId" in projected.value.value, false);
    assert.equal(projected.value.value.displayName, "Identity document");
  });

  it("omits sensitive fields when Policy evaluation throws", async () => {
    const throwingPolicy: PolicyEngine = {
      async evaluate() {
        throw new Error("policy unavailable");
      },
    };
    const { ctx } = testContext([], { policyEngine: throwingPolicy });
    const projected = await projectFields(
      ctx,
      resource("kyc_asset", "kyc-1"),
      {
        assetId: "kyc-1",
        displayName: "Identity document",
        nationalId: "35202-1234567-1",
      },
      kycRules,
    );

    assert.ok(projected.ok);
    assert.equal("nationalId" in projected.value.value, false);
    assert.equal(
      projected.value.decisions[0]?.reasonCode,
      "policy_evaluation_failed",
    );
  });
});

describe("RC5.6 restricted writes", () => {
  it("rejects a forbidden sensitive patch before any repository mutation", async () => {
    let saveCalls = 0;
    const { ctx, audit, auditStore } = testContext([
      "finance.payments.record",
    ]);
    const deps = {
      audit,
      payments: {
        async save() {
          saveCalls += 1;
          return ok(undefined);
        },
      },
    } as unknown as FinanceHandlerDeps;
    const handler = createRecordPaymentHandler(deps);
    const payload: RecordPaymentPayload = {
      companyId: COMPANY,
      amount: { currencyCode: "PKR", amountMinor: "1000" },
      methodId: "restricted-bank-id",
      externalRef: "restricted-reference",
    };
    const command: Command<RecordPaymentPayload> = {
      commandId: CommandId.from("command-1"),
      commandType: handler.commandType,
      payload,
      metadata: {
        correlationId: CorrelationId.from("correlation-1"),
        causationId: null,
        companyId: COMPANY,
        actorId: null,
        issuedAt: new Date(),
      },
      idempotencyKey: null,
    };

    const result = await handler.handle(command, ctx);

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error instanceof AuthorizationError);
    assert.ok(!result.ok && result.error.code === "field_update_denied");
    assert.equal(saveCalls, 0);
    assert.ok(
      auditStore.records.some(
        (record) =>
          record.action === "field.update" && record.outcome === "failure",
      ),
    );
  });

  it("fails closed when a restricted patch has no active principal", async () => {
    const { ctx } = testContext([]);
    const noPrincipal = { ...ctx, principal: null };
    const result = await authorizeFieldPatch(
      noPrincipal,
      resource("credit_account", "credit-1"),
      { limitAmount: "500000" },
      [
        {
          field: "limitAmount",
          permission: Rc5FieldPermissions.FinanceCreditAccountsUpdate,
          sensitivity: "financial",
        },
      ],
    );

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error.code === "field_update_denied");
  });

  it("allows a restricted patch only when Policy grants its field permission", async () => {
    const { ctx } = testContext([
      Rc5FieldPermissions.FinanceCreditAccountsUpdate,
    ]);
    const result = await authorizeFieldPatch(
      ctx,
      resource("credit_account", "credit-1"),
      { limitAmount: "500000" },
      [
        {
          field: "limitAmount",
          permission: Rc5FieldPermissions.FinanceCreditAccountsUpdate,
          sensitivity: "financial",
        },
      ],
    );

    assert.ok(result.ok);
    assert.equal(result.value[0]?.allowed, true);
  });
});
