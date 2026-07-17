import type { CommandHandler } from "@afh/application";
import type { Money } from "@afh/commerce";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  FinancialAccount,
  FinancialAccountStatus,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
} from "@afh/finance";
import { FinancialEventTypes } from "@afh/finance";
import {
  FinanceApprovalTypes,
  FinanceCommandTypes,
  FinancePolicyActions,
  FinanceRuleSetCodes,
  FinanceSubjectTypes,
  FinanceWorkflowCodes,
} from "../constants.js";
import type {
  CreateFinancialAccountPayload,
  CreateInvoicePayload,
  UpdateFinancialAccountPayload,
  UpdateInvoicePayload,
} from "../commands/commands.js";
import {
  createFinancialAccountCommandValidator,
  createInvoiceCommandValidator,
  updateFinancialAccountCommandValidator,
  updateInvoiceCommandValidator,
} from "../validators/validators.js";
import type { FinanceHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildFinanceEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  invokeFinanceRules,
  newEntityId,
  recordFinanceAudit,
  requireApproval,
  requireCompanyId,
  toMoney,
  workflowOrFail,
} from "../support/support.js";

function mapAccountStatus(projection: string): FinancialAccountStatus {
  const known: FinancialAccountStatus[] = [
    "draft",
    "active",
    "inactive",
    "closed",
  ];
  return (known.includes(projection as FinancialAccountStatus)
    ? projection
    : "draft") as FinancialAccountStatus;
}

function mapInvoiceStatus(projection: string): InvoiceStatus {
  const known: InvoiceStatus[] = [
    "draft",
    "issued",
    "partially_paid",
    "paid",
    "void",
    "cancelled",
  ];
  return (known.includes(projection as InvoiceStatus)
    ? projection
    : "draft") as InvoiceStatus;
}

function moneyFromActions(
  actions: readonly Readonly<Record<string, unknown>>[],
  key: string,
): Money | null {
  const matched = actions.find((a) => a[key] != null);
  if (!matched) return null;
  const raw = matched[key] as
    | { currencyCode?: string; amountMinor?: string | number | bigint }
    | undefined;
  if (!raw?.currencyCode || raw.amountMinor == null) return null;
  try {
    return {
      currencyCode: raw.currencyCode,
      amountMinor: BigInt(raw.amountMinor),
    };
  } catch {
    return null;
  }
}

export function createCreateFinancialAccountHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<CreateFinancialAccountPayload, { accountId: string }> {
  return {
    commandType: FinanceCommandTypes.CreateFinancialAccount,
    authorize(command) {
      return companyResource(
        "financial_account",
        FinancePolicyActions.AccountCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createFinancialAccountCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: FinanceWorkflowCodes.FinancialAccount,
        subjectType: FinanceSubjectTypes.FinancialAccount,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const account: FinancialAccount = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        accountType: p.accountType,
        status: mapAccountStatus(started.value.statusProjection),
        currencyCode: p.currencyCode ?? null,
        parentAccountId: p.parentAccountId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.accounts.save(account);
      if (!saved.ok) return saved;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.CreateFinancialAccount,
        entityType: "financial_account",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ accountId: id });
    },
  };
}

export function createUpdateFinancialAccountHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<UpdateFinancialAccountPayload, { accountId: string }> {
  return {
    commandType: FinanceCommandTypes.UpdateFinancialAccount,
    authorize(command) {
      return companyResource(
        "financial_account",
        FinancePolicyActions.AccountUpdate,
        command.payload.companyId,
        command.payload.accountId,
      );
    },
    validate() {
      return updateFinancialAccountCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.accounts.findById({
        companyId: scope.value,
        id: command.payload.accountId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Financial account not found", {
            code: "financial_account_not_found",
          }),
        );
      }

      const p = command.payload;
      let status = existing.value.status;

      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapAccountStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: FinancialAccount = {
        ...existing.value,
        code: p.code ?? existing.value.code,
        name: p.name ?? existing.value.name,
        accountType: p.accountType ?? existing.value.accountType,
        currencyCode:
          p.currencyCode !== undefined
            ? p.currencyCode
            : existing.value.currencyCode,
        parentAccountId:
          p.parentAccountId !== undefined
            ? p.parentAccountId
            : existing.value.parentAccountId,
        status,
        updatedAt: now,
      };

      const saved = await deps.accounts.save(updated);
      if (!saved.ok) return saved;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.UpdateFinancialAccount,
        entityType: "financial_account",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ accountId: updated.id });
    },
  };
}

export function createCreateInvoiceHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<CreateInvoicePayload, { invoiceId: string }> {
  return {
    commandType: FinanceCommandTypes.CreateInvoice,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "invoice",
        FinancePolicyActions.InvoiceCreate,
        p.companyId,
        null,
        {
          organizationId: p.organizationId ?? null,
          attributes: {
            customerId: p.customerId ?? null,
            billToAddressId: p.billToAddressId ?? null,
          },
        },
      );
    },
    validate() {
      return createInvoiceCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const p = command.payload;

      const taxRules = await invokeFinanceRules(ctx, FinanceRuleSetCodes.Tax, {
        companyId: scope.value,
        currencyCode: p.currencyCode,
        lines: p.lines,
      });
      if (!taxRules.ok) return taxRules;

      const pricingRules = await invokeFinanceRules(
        ctx,
        FinanceRuleSetCodes.Pricing,
        {
          companyId: scope.value,
          currencyCode: p.currencyCode,
          lines: p.lines,
        },
      );
      if (!pricingRules.ok) return pricingRules;

      const invoiceId = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: FinanceWorkflowCodes.Invoice,
        subjectType: FinanceSubjectTypes.Invoice,
        subjectId: invoiceId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const actions = [
        ...(taxRules.value?.actions ?? []),
        ...(pricingRules.value?.actions ?? []),
      ];
      const subtotal = moneyFromActions(actions, "subtotal");
      const taxTotal = moneyFromActions(actions, "taxTotal");
      const total = moneyFromActions(actions, "total");

      const invoice: Invoice = {
        id: invoiceId,
        companyId: scope.value,
        number: p.number,
        status: mapInvoiceStatus(started.value.statusProjection),
        currencyCode: p.currencyCode,
        customerId: p.customerId ?? null,
        organizationId: p.organizationId ?? null,
        billToAddressId: p.billToAddressId ?? null,
        issuedAt: p.issuedAt ?? null,
        dueAt: p.dueAt ?? null,
        subtotal,
        taxTotal,
        total,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.invoices.save(invoice);
      if (!saved.ok) return saved;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        let unitAmount: Money | null = null;
        let lineAmount: Money | null = null;
        if (intent.unitAmount) {
          const m = toMoney(intent.unitAmount);
          if (!m.ok) return m;
          unitAmount = m.value;
        }
        if (intent.lineAmount) {
          const m = toMoney(intent.lineAmount);
          if (!m.ok) return m;
          lineAmount = m.value;
        }
        const line: InvoiceLine = {
          id: newEntityId(),
          invoiceId,
          companyId: scope.value,
          lineNumber: i + 1,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          unitAmount,
          lineAmount,
          taxCategoryId: intent.taxCategoryId ?? null,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
        };
        const savedLine = await deps.invoices.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildFinanceEvent({
        eventType: FinancialEventTypes.InvoiceCreated,
        aggregateType: "invoice",
        aggregateId: invoiceId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { invoiceId, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.CreateInvoice,
        entityType: "invoice",
        entityId: invoiceId,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ invoiceId });
    },
  };
}

export function createUpdateInvoiceHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<
  UpdateInvoicePayload,
  {
    invoiceId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: FinanceCommandTypes.UpdateInvoice,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.invoices.findById({ companyId: p.companyId, id: p.invoiceId }),
      );
      return companyResource(
        "invoice",
        FinancePolicyActions.InvoiceUpdate,
        p.companyId,
        p.invoiceId,
        {
          organizationId: record?.organizationId ?? null,
          attributes: {
            customerId: record?.customerId ?? null,
            billToAddressId: record?.billToAddressId ?? null,
          },
        },
      );
    },
    validate() {
      return updateInvoiceCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.invoices.findById({
        companyId: scope.value,
        id: command.payload.invoiceId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Invoice not found", { code: "invoice_not_found" }),
        );
      }

      const p = command.payload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for invoice update", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: FinanceApprovalTypes.InvoiceIssue,
          subjectType: FinanceSubjectTypes.Invoice,
          subjectId: p.invoiceId,
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordFinanceAudit(deps.audit, ctx, {
          action: FinanceCommandTypes.UpdateInvoice,
          entityType: "invoice",
          entityId: p.invoiceId,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          invoiceId: p.invoiceId,
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      let status = existing.value.status;
      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapInvoiceStatus(transitioned.value.statusProjection);
      }

      const now = ctx.clock.now().toISOString();
      const updated: Invoice = {
        ...existing.value,
        number: p.number ?? existing.value.number,
        customerId:
          p.customerId !== undefined ? p.customerId : existing.value.customerId,
        organizationId:
          p.organizationId !== undefined
            ? p.organizationId
            : existing.value.organizationId,
        billToAddressId:
          p.billToAddressId !== undefined
            ? p.billToAddressId
            : existing.value.billToAddressId,
        issuedAt: p.issuedAt !== undefined ? p.issuedAt : existing.value.issuedAt,
        dueAt: p.dueAt !== undefined ? p.dueAt : existing.value.dueAt,
        status,
        updatedAt: now,
      };

      const saved = await deps.invoices.save(updated);
      if (!saved.ok) return saved;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.UpdateInvoice,
        entityType: "invoice",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ invoiceId: updated.id, pendingApproval: false });
    },
  };
}
