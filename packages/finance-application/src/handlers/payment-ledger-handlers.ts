import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  CreditAdjustment,
  FinancialLedger,
  FinancialLedgerEntry,
  Payment,
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
  AppendLedgerEntryPayload,
  CreateLedgerPayload,
  RecordCreditAdjustmentPayload,
  RecordPaymentPayload,
} from "../commands/commands.js";
import {
  appendLedgerEntryCommandValidator,
  createLedgerCommandValidator,
  recordCreditAdjustmentCommandValidator,
  recordPaymentCommandValidator,
} from "../validators/validators.js";
import type { FinanceHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildFinanceEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeFinanceRules,
  newEntityId,
  recordFinanceAudit,
  requireApproval,
  requireCompanyId,
  toMoney,
  workflowOrFail,
} from "../support/support.js";

export function createRecordPaymentHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<
  RecordPaymentPayload,
  {
    paymentId?: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: FinanceCommandTypes.RecordPayment,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "payment",
        FinancePolicyActions.PaymentRecord,
        p.companyId,
        null,
        {
          organizationId: p.payerOrganizationId ?? null,
          attributes: {
            invoiceId: p.invoiceId ?? null,
            payerCustomerId: p.payerCustomerId ?? null,
            methodId: p.methodId ?? null,
          },
        },
      );
    },
    validate() {
      return recordPaymentCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const amount = toMoney(p.amount);
      if (!amount.ok) return amount;

      const rules = await invokeFinanceRules(
        ctx,
        FinanceRuleSetCodes.PaymentPolicy,
        {
          companyId: scope.value,
          invoiceId: p.invoiceId ?? null,
          amountMinor: p.amount.amountMinor,
          currencyCode: p.amount.currencyCode,
        },
      );
      if (!rules.ok) return rules;

      const creditRules = await invokeFinanceRules(
        ctx,
        FinanceRuleSetCodes.CreditPolicy,
        {
          companyId: scope.value,
          payerCustomerId: p.payerCustomerId ?? null,
          amountMinor: p.amount.amountMinor,
        },
      );
      if (!creditRules.ok) return creditRules;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError("ApprovalEngine required for payment", {
              code: "approval_not_wired",
            }),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: FinanceApprovalTypes.LargePayment,
          subjectType: FinanceSubjectTypes.Payment,
          subjectId: p.invoiceId ?? "payment",
          payload: {
            amountMinor: p.amount.amountMinor,
            currencyCode: p.amount.currencyCode,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordFinanceAudit(deps.audit, ctx, {
          action: FinanceCommandTypes.RecordPayment,
          entityType: "payment",
          entityId: null,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const paymentId = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: FinanceWorkflowCodes.Payment,
        subjectType: FinanceSubjectTypes.Payment,
        subjectId: paymentId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const payment: Payment = {
        id: paymentId,
        companyId: scope.value,
        status: "captured",
        amount: amount.value,
        method:
          p.methodKind || p.methodId
            ? {
                methodId: p.methodId ?? "unknown",
                kind: p.methodKind ?? "other",
                label: p.methodLabel ?? null,
              }
            : null,
        invoiceId: p.invoiceId ?? null,
        payerCustomerId: p.payerCustomerId ?? null,
        payerOrganizationId: p.payerOrganizationId ?? null,
        externalRef: p.externalRef ?? null,
        correlationId: ctx.correlationId,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.payments.save(payment);
      if (!saved.ok) return saved;

      // Never mutate invoice balances here — ledger postings / projections later
      const event = buildFinanceEvent({
        eventType: FinancialEventTypes.PaymentRecorded,
        aggregateType: "payment",
        aggregateId: paymentId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          paymentId,
          companyId: scope.value,
          invoiceId: p.invoiceId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.RecordPayment,
        entityType: "payment",
        entityId: paymentId,
        outcome: "success",
        details: {
          invoiceId: p.invoiceId ?? null,
          workflowInstanceId: started.value.id,
        },
      });

      return ok({ paymentId, pendingApproval: false });
    },
  };
}

export function createRecordCreditAdjustmentHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<
  RecordCreditAdjustmentPayload,
  {
    adjustmentId?: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: FinanceCommandTypes.RecordCreditAdjustment,
    authorize(command) {
      return companyResource(
        "credit_account",
        FinancePolicyActions.CreditAdjust,
        command.payload.companyId,
        command.payload.creditAccountId,
      );
    },
    validate() {
      return recordCreditAdjustmentCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const amount = toMoney(p.amount);
      if (!amount.ok) return amount;

      const account = await deps.credits.findAccountById({
        companyId: scope.value,
        id: p.creditAccountId,
      });
      if (!account.ok) return account;
      if (!account.value) {
        return fail(
          new NotFoundError("Credit account not found", {
            code: "credit_account_not_found",
          }),
        );
      }

      const rules = await invokeFinanceRules(
        ctx,
        FinanceRuleSetCodes.CreditPolicy,
        {
          companyId: scope.value,
          creditAccountId: p.creditAccountId,
          kind: p.kind,
          amountMinor: p.amount.amountMinor,
        },
      );
      if (!rules.ok) return rules;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError(
              "ApprovalEngine required for credit adjustment",
              { code: "approval_not_wired" },
            ),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: FinanceApprovalTypes.CreditWriteOff,
          subjectType: FinanceSubjectTypes.CreditAccount,
          subjectId: p.creditAccountId,
          payload: { kind: p.kind, amountMinor: p.amount.amountMinor },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordFinanceAudit(deps.audit, ctx, {
          action: FinanceCommandTypes.RecordCreditAdjustment,
          entityType: "credit_adjustment",
          entityId: null,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const adjustmentId = newEntityId();
      const now = ctx.clock.now().toISOString();
      const adjustment: CreditAdjustment = {
        id: adjustmentId,
        companyId: scope.value,
        creditAccountId: p.creditAccountId,
        kind: p.kind,
        amount: amount.value,
        reason: p.reason ?? null,
        correlationId: ctx.correlationId,
        occurredAt: now,
        createdAt: now,
      };

      const saved = await deps.credits.saveAdjustment(adjustment);
      if (!saved.ok) return saved;

      const event = buildFinanceEvent({
        eventType: FinancialEventTypes.CreditAdjusted,
        aggregateType: "credit_account",
        aggregateId: p.creditAccountId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          creditAccountId: p.creditAccountId,
          companyId: scope.value,
          adjustmentId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.RecordCreditAdjustment,
        entityType: "credit_adjustment",
        entityId: adjustmentId,
        outcome: "success",
        details: { kind: p.kind, creditAccountId: p.creditAccountId },
      });

      return ok({ adjustmentId, pendingApproval: false });
    },
  };
}

export function createCreateLedgerHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<CreateLedgerPayload, { ledgerId: string }> {
  return {
    commandType: FinanceCommandTypes.CreateLedger,
    authorize(command) {
      return companyResource(
        "ledger",
        FinancePolicyActions.LedgerCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createLedgerCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const ledger: FinancialLedger = {
        id,
        companyId: scope.value,
        code: p.code,
        name: p.name,
        kind: p.kind,
        currencyCode: p.currencyCode ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.ledgers.save(ledger);
      if (!saved.ok) return saved;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.CreateLedger,
        entityType: "financial_ledger",
        entityId: id,
        outcome: "success",
      });

      return ok({ ledgerId: id });
    },
  };
}

/**
 * Append-only Financial Ledger entry — balances are projections only.
 * Handlers never mutate account balances directly.
 */
export function createAppendLedgerEntryHandler(
  deps: FinanceHandlerDeps,
): CommandHandler<AppendLedgerEntryPayload, { ledgerEntryId: string }> {
  return {
    commandType: FinanceCommandTypes.AppendLedgerEntry,
    authorize(command) {
      return companyResource(
        "ledger",
        FinancePolicyActions.LedgerAppend,
        command.payload.companyId,
        command.payload.ledgerId,
      );
    },
    validate() {
      return appendLedgerEntryCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const amount = toMoney(p.amount);
      if (!amount.ok) return amount;

      const ledger = await deps.ledgers.findById({
        companyId: scope.value,
        id: p.ledgerId,
      });
      if (!ledger.ok) return ledger;
      if (!ledger.value) {
        return fail(
          new NotFoundError("Financial ledger not found", {
            code: "ledger_not_found",
          }),
        );
      }

      const account = await deps.accounts.findById({
        companyId: scope.value,
        id: p.accountId,
      });
      if (!account.ok) return account;
      if (!account.value) {
        return fail(
          new NotFoundError("Financial account not found", {
            code: "financial_account_not_found",
          }),
        );
      }

      const rules = await invokeFinanceRules(
        ctx,
        FinanceRuleSetCodes.PostingPolicy,
        {
          companyId: scope.value,
          ledgerId: p.ledgerId,
          accountId: p.accountId,
          side: p.side,
          amountMinor: p.amount.amountMinor,
        },
      );
      if (!rules.ok) return rules;

      const entryId = newEntityId();
      const now = ctx.clock.now().toISOString();
      const entry: FinancialLedgerEntry = {
        id: entryId,
        companyId: scope.value,
        ledgerId: p.ledgerId,
        accountId: p.accountId,
        side: p.side,
        amount: amount.value,
        postingRef: p.postingRef ?? null,
        balanceRef: p.balanceRef ?? null,
        correlationId: ctx.correlationId,
        causationId: command.commandId.value,
        subjectType: p.subjectType ?? null,
        subjectId: p.subjectId ?? null,
        occurredAt: p.occurredAt ?? now,
        recordedAt: now,
      };

      const appended = await deps.ledgers.appendEntry(entry);
      if (!appended.ok) return appended;

      const event = buildFinanceEvent({
        eventType: FinancialEventTypes.LedgerEntryCreated,
        aggregateType: "financial_ledger",
        aggregateId: p.ledgerId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          ledgerEntryId: entryId,
          companyId: scope.value,
          ledgerId: p.ledgerId,
          accountId: p.accountId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordFinanceAudit(deps.audit, ctx, {
        action: FinanceCommandTypes.AppendLedgerEntry,
        entityType: "financial_ledger_entry",
        entityId: entryId,
        outcome: "success",
        details: {
          ledgerId: p.ledgerId,
          accountId: p.accountId,
          side: p.side,
        },
      });

      return ok({ ledgerEntryId: entryId });
    },
  };
}
