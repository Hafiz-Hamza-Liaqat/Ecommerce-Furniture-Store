import {
  Rc5FieldPermissions,
  auditFieldDecisions,
  authorizeFieldPatch,
  projectFields,
  type ApplicationContext,
  type FieldReadRule,
  type FieldWriteRule,
} from "@afh/application";
import type {
  CreditAccount,
  CreditAdjustment,
  Invoice,
  InvoiceLine,
  Payment,
} from "@afh/finance";
import type { PolicyResource, SecurityAuditService } from "@afh/identity";
import type { PlatformError, Result } from "@afh/shared-kernel";
import { ok } from "@afh/shared-kernel";
import type {
  InvoiceLineIntent,
  RecordPaymentPayload,
} from "../commands/commands.js";

export type InvoiceFieldView = Omit<
  Invoice,
  "subtotal" | "taxTotal" | "total"
> &
  Partial<Pick<Invoice, "subtotal" | "taxTotal" | "total">>;

export type InvoiceLineFieldView = Omit<
  InvoiceLine,
  "unitAmount" | "lineAmount"
> &
  Partial<Pick<InvoiceLine, "unitAmount" | "lineAmount">>;

export type PaymentFieldView = Omit<Payment, "method" | "externalRef"> &
  Partial<Pick<Payment, "method" | "externalRef">>;

export type CreditAccountFieldView = {
  readonly account: CreditAccount;
  readonly adjustments?: readonly CreditAdjustment[];
};

const invoiceRules: readonly FieldReadRule<Invoice>[] = [
  {
    field: "subtotal",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
    denied: "omit",
  },
  {
    field: "taxTotal",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
    denied: "omit",
  },
  {
    field: "total",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
    denied: "omit",
  },
];

const invoiceLineRules: readonly FieldReadRule<InvoiceLine>[] = [
  {
    field: "unitAmount",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
    denied: "omit",
  },
  {
    field: "lineAmount",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
    denied: "omit",
  },
];

function maskIdentifier(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length <= 4) return "•".repeat(4);
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(4, value.length - visible.length))}${visible}`;
}

const paymentRules: readonly FieldReadRule<Payment>[] = [
  {
    field: "method",
    permission: Rc5FieldPermissions.FinanceBankAccountsRead,
    sensitivity: "restricted",
    denied: "mask",
    mask(value) {
      if (!value || typeof value !== "object") return null;
      const method = value as NonNullable<Payment["method"]>;
      return {
        ...method,
        methodId: maskIdentifier(method.methodId) ?? "••••",
        label: null,
      };
    },
  },
  {
    field: "externalRef",
    permission: Rc5FieldPermissions.FinanceBankAccountsRead,
    sensitivity: "restricted",
    denied: "mask",
    mask: maskIdentifier,
  },
];

const creditRules: readonly FieldReadRule<{
  readonly adjustments: readonly CreditAdjustment[];
}>[] = [
  {
    field: "adjustments",
    permission: Rc5FieldPermissions.FinanceCreditAccountsUpdate,
    sensitivity: "financial",
    denied: "omit",
  },
];

const invoiceLineWriteRules: readonly FieldWriteRule<InvoiceLineIntent>[] = [
  {
    field: "unitAmount",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
  },
  {
    field: "lineAmount",
    permission: Rc5FieldPermissions.FinanceCostsRead,
    sensitivity: "financial",
  },
];

const paymentWriteRules: readonly FieldWriteRule<RecordPaymentPayload>[] = [
  {
    field: "methodId",
    permission: Rc5FieldPermissions.FinanceBankAccountsRead,
    sensitivity: "restricted",
  },
  {
    field: "methodLabel",
    permission: Rc5FieldPermissions.FinanceBankAccountsRead,
    sensitivity: "restricted",
  },
  {
    field: "externalRef",
    permission: Rc5FieldPermissions.FinanceBankAccountsRead,
    sensitivity: "restricted",
  },
];

export async function projectInvoiceFields(
  ctx: ApplicationContext,
  audit: SecurityAuditService,
  resource: PolicyResource,
  invoice: Invoice,
  lines: readonly InvoiceLine[],
): Promise<
  Result<
    {
      readonly invoice: InvoiceFieldView;
      readonly lines: readonly InvoiceLineFieldView[];
    },
    PlatformError
  >
> {
  const invoiceProjection = await projectFields(
    ctx,
    resource,
    invoice,
    invoiceRules,
  );
  if (!invoiceProjection.ok) return invoiceProjection;
  await auditFieldDecisions(
    audit,
    ctx,
    resource,
    "read",
    invoiceProjection.value.decisions,
  );

  const projectedLines: InvoiceLineFieldView[] = [];
  for (const line of lines) {
    const lineResource: PolicyResource = {
      ...resource,
      type: "invoice_line",
      id: line.id,
    };
    const projected = await projectFields(
      ctx,
      lineResource,
      line,
      invoiceLineRules,
    );
    if (!projected.ok) return projected;
    await auditFieldDecisions(
      audit,
      ctx,
      lineResource,
      "read",
      projected.value.decisions,
    );
    projectedLines.push(projected.value.value as InvoiceLineFieldView);
  }

  return ok({
    invoice: invoiceProjection.value.value as InvoiceFieldView,
    lines: projectedLines,
  });
}

export async function projectPaymentFields(
  ctx: ApplicationContext,
  audit: SecurityAuditService,
  resource: PolicyResource,
  payment: Payment,
): Promise<Result<PaymentFieldView, PlatformError>> {
  const projected = await projectFields(ctx, resource, payment, paymentRules);
  if (!projected.ok) return projected;
  await auditFieldDecisions(
    audit,
    ctx,
    resource,
    "read",
    projected.value.decisions,
  );
  return ok(projected.value.value as PaymentFieldView);
}

export async function projectCreditAccountFields(
  ctx: ApplicationContext,
  audit: SecurityAuditService,
  resource: PolicyResource,
  account: CreditAccount,
  adjustments: readonly CreditAdjustment[],
): Promise<Result<CreditAccountFieldView, PlatformError>> {
  const projected = await projectFields(
    ctx,
    resource,
    { adjustments },
    creditRules,
  );
  if (!projected.ok) return projected;
  await auditFieldDecisions(
    audit,
    ctx,
    resource,
    "read",
    projected.value.decisions,
  );
  return ok({
    account,
    ...(projected.value.value.adjustments !== undefined
      ? { adjustments: projected.value.value.adjustments }
      : {}),
  });
}

export async function authorizeInvoiceLineFields(
  ctx: ApplicationContext,
  audit: SecurityAuditService,
  resource: PolicyResource,
  lines: readonly InvoiceLineIntent[],
): Promise<Result<void, PlatformError>> {
  for (let index = 0; index < lines.length; index++) {
    const decision = await authorizeFieldPatch(
      ctx,
      {
        ...resource,
        type: "invoice_line",
        id: null,
        attributes: { ...resource.attributes, lineIndex: index },
      },
      lines[index]!,
      invoiceLineWriteRules,
    );
    if (!decision.ok) {
      const deniedDecisions = invoiceLineWriteRules
        .filter((rule) =>
          Object.prototype.hasOwnProperty.call(lines[index]!, rule.field),
        )
        .map((rule) => ({
          field: rule.field,
          permission: rule.permission,
          sensitivity: rule.sensitivity,
          allowed: false,
          reasonCode: "field_update_denied",
        }));
      await auditFieldDecisions(
        audit,
        ctx,
        resource,
        "update",
        deniedDecisions,
      );
      return decision;
    }
    await auditFieldDecisions(
      audit,
      ctx,
      resource,
      "update",
      decision.value,
    );
  }
  return ok(undefined);
}

export async function authorizePaymentFields(
  ctx: ApplicationContext,
  audit: SecurityAuditService,
  resource: PolicyResource,
  payload: RecordPaymentPayload,
): Promise<Result<void, PlatformError>> {
  const decision = await authorizeFieldPatch(
    ctx,
    resource,
    payload,
    paymentWriteRules,
  );
  if (!decision.ok) {
    const deniedDecisions = paymentWriteRules
      .filter((rule) =>
        Object.prototype.hasOwnProperty.call(payload, rule.field),
      )
      .map((rule) => ({
        field: rule.field,
        permission: rule.permission,
        sensitivity: rule.sensitivity,
        allowed: false,
        reasonCode: "field_update_denied",
      }));
    await auditFieldDecisions(
      audit,
      ctx,
      resource,
      "update",
      deniedDecisions,
    );
    return decision;
  }
  await auditFieldDecisions(
    audit,
    ctx,
    resource,
    "update",
    decision.value,
  );
  return ok(undefined);
}
