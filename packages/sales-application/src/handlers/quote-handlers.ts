import type { ApplicationContext, CommandHandler } from "@afh/application";
import type {
  DiscountReference,
  PriceReference,
  TaxReference,
} from "@afh/commerce";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Quote, QuoteLine, QuoteRevision, QuoteStatus } from "@afh/sales";
import { SalesEventTypes } from "@afh/sales";
import {
  SalesCommandTypes,
  SalesPolicyActions,
  SalesRuleSetCodes,
  SalesSubjectTypes,
  SalesWorkflowCodes,
} from "../constants.js";
import type {
  CreateQuotePayload,
  QuoteLineIntent,
  ReviseQuotePayload,
} from "../commands/commands.js";
import {
  createQuoteCommandValidator,
  reviseQuoteCommandValidator,
} from "../validators/validators.js";
import type { SalesHandlerDeps } from "./deps.js";
import {
  buildSalesEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeSalesRules,
  newEntityId,
  recordSalesAudit,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

type LineRefs = {
  readonly priceRef: PriceReference | null;
  readonly discountRef: DiscountReference | null;
  readonly taxRef: TaxReference | null;
};

function refsFromActions(
  actions: readonly Readonly<Record<string, unknown>>[],
  lineNumber: number,
): LineRefs {
  const matched =
    actions.find((a) => a.lineNumber === lineNumber) ?? actions[0];
  if (!matched) {
    return { priceRef: null, discountRef: null, taxRef: null };
  }
  return {
    priceRef: (matched.priceRef as PriceReference | null | undefined) ?? null,
    discountRef:
      (matched.discountRef as DiscountReference | null | undefined) ?? null,
    taxRef: (matched.taxRef as TaxReference | null | undefined) ?? null,
  };
}

function mapQuoteStatus(projection: string): QuoteStatus {
  const known: QuoteStatus[] = [
    "draft",
    "submitted",
    "approved",
    "rejected",
    "expired",
    "converted",
    "cancelled",
  ];
  return (known.includes(projection as QuoteStatus)
    ? projection
    : "draft") as QuoteStatus;
}

async function evaluateLineRules(
  ctx: ApplicationContext,
  companyId: string,
  lines: readonly QuoteLineIntent[],
) {
  const pricing = await invokeSalesRules(ctx, SalesRuleSetCodes.Pricing, {
    companyId,
    lines,
  });
  if (!pricing.ok) return pricing;

  const discount = await invokeSalesRules(
    ctx,
    SalesRuleSetCodes.DiscountEligibility,
    { companyId, lines },
  );
  if (!discount.ok) return discount;

  const tax = await invokeSalesRules(ctx, SalesRuleSetCodes.Tax, {
    companyId,
    lines,
  });
  if (!tax.ok) return tax;

  const credit = await invokeSalesRules(ctx, SalesRuleSetCodes.CreditCheck, {
    companyId,
  });
  if (!credit.ok) return credit;

  return ok({
    pricingActions: pricing.value?.actions ?? [],
    discountActions: discount.value?.actions ?? [],
    taxActions: tax.value?.actions ?? [],
  });
}

export function createCreateQuoteHandler(
  deps: SalesHandlerDeps,
): CommandHandler<
  CreateQuotePayload,
  { quoteId: string; revisionId: string }
> {
  return {
    commandType: SalesCommandTypes.CreateQuote,
    authorize(command) {
      return companyResource(
        "quote",
        SalesPolicyActions.QuoteCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createQuoteCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const rules = await evaluateLineRules(
        ctx,
        scope.value,
        command.payload.lines,
      );
      if (!rules.ok) return rules;

      const quoteId = newEntityId();
      const revisionId = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: SalesWorkflowCodes.Quote,
        subjectType: SalesSubjectTypes.Quote,
        subjectId: quoteId,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const quote: Quote = {
        id: quoteId,
        companyId: scope.value,
        number: p.number,
        status: mapQuoteStatus(started.value.statusProjection),
        customerId: p.customerId ?? null,
        organizationId: p.organizationId ?? null,
        opportunityId: p.opportunityId ?? null,
        projectId: p.projectId ?? null,
        salesRepUserId: p.salesRepUserId ?? ctx.userId,
        currencyCode: p.currencyCode,
        currentRevisionId: revisionId,
        terms: p.terms
          ? {
              paymentTerms: p.terms.paymentTerms ?? null,
              deliveryTerms: p.terms.deliveryTerms ?? null,
              validityDays: p.terms.validityDays ?? null,
              notes: p.terms.notes ?? null,
            }
          : null,
        createdAt: now,
        updatedAt: now,
      };

      const revision: QuoteRevision = {
        id: revisionId,
        quoteId,
        companyId: scope.value,
        revisionNumber: 1,
        createdByUserId: ctx.userId,
        createdAt: now,
        notes: null,
      };

      const savedQuote = await deps.quotes.save(quote);
      if (!savedQuote.ok) return savedQuote;
      const savedRev = await deps.quotes.saveRevision(revision);
      if (!savedRev.ok) return savedRev;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        const lineNumber = i + 1;
        const price = refsFromActions(rules.value.pricingActions, lineNumber);
        const discount = refsFromActions(
          rules.value.discountActions,
          lineNumber,
        );
        const tax = refsFromActions(rules.value.taxActions, lineNumber);
        const line: QuoteLine = {
          id: newEntityId(),
          quoteId,
          revisionId,
          companyId: scope.value,
          lineNumber,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
          inventoryItemId: intent.inventoryItemId ?? null,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          priceRef: price.priceRef,
          discountRef: discount.discountRef,
          taxRef: tax.taxRef,
        };
        const savedLine = await deps.quotes.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildSalesEvent({
        eventType: SalesEventTypes.QuoteCreated,
        aggregateType: "quote",
        aggregateId: quoteId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { quoteId, companyId: scope.value },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.CreateQuote,
        entityType: "quote",
        entityId: quoteId,
        outcome: "success",
        details: { revisionId, workflowInstanceId: started.value.id },
      });

      return ok({ quoteId, revisionId });
    },
  };
}

export function createReviseQuoteHandler(
  deps: SalesHandlerDeps,
): CommandHandler<
  ReviseQuotePayload,
  { quoteId: string; revisionId: string; revisionNumber: number }
> {
  return {
    commandType: SalesCommandTypes.ReviseQuote,
    authorize(command) {
      return companyResource(
        "quote",
        SalesPolicyActions.QuoteRevise,
        command.payload.companyId,
        command.payload.quoteId,
      );
    },
    validate() {
      return reviseQuoteCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.quotes.findById({
        companyId: scope.value,
        id: command.payload.quoteId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Quote not found", { code: "quote_not_found" }),
        );
      }

      const rules = await evaluateLineRules(
        ctx,
        scope.value,
        command.payload.lines,
      );
      if (!rules.ok) return rules;

      let status = existing.value.status;
      if (command.payload.transitionCode && command.payload.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: command.payload.workflowInstanceId,
          transitionCode: command.payload.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapQuoteStatus(transitioned.value.statusProjection);
      }

      const nextRevisionNumber =
        (command.payload.previousRevisionNumber ?? 1) + 1;
      const revisionId = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const revision: QuoteRevision = {
        id: revisionId,
        quoteId: existing.value.id,
        companyId: scope.value,
        revisionNumber: nextRevisionNumber,
        createdByUserId: ctx.userId,
        createdAt: now,
        notes: p.notes ?? null,
      };

      const quote: Quote = {
        ...existing.value,
        status,
        currentRevisionId: revisionId,
        terms: p.terms
          ? {
              paymentTerms: p.terms.paymentTerms ?? null,
              deliveryTerms: p.terms.deliveryTerms ?? null,
              validityDays: p.terms.validityDays ?? null,
              notes: p.terms.notes ?? null,
            }
          : existing.value.terms,
        updatedAt: now,
      };

      const savedQuote = await deps.quotes.save(quote);
      if (!savedQuote.ok) return savedQuote;
      const savedRev = await deps.quotes.saveRevision(revision);
      if (!savedRev.ok) return savedRev;

      for (let i = 0; i < p.lines.length; i++) {
        const intent = p.lines[i]!;
        const lineNumber = i + 1;
        const price = refsFromActions(rules.value.pricingActions, lineNumber);
        const discount = refsFromActions(
          rules.value.discountActions,
          lineNumber,
        );
        const tax = refsFromActions(rules.value.taxActions, lineNumber);
        const line: QuoteLine = {
          id: newEntityId(),
          quoteId: quote.id,
          revisionId,
          companyId: scope.value,
          lineNumber,
          productId: intent.productId ?? null,
          variantId: intent.variantId ?? null,
          inventoryItemId: intent.inventoryItemId ?? null,
          description: intent.description,
          quantity: intent.quantity,
          unitCode: intent.unitCode ?? null,
          priceRef: price.priceRef,
          discountRef: discount.discountRef,
          taxRef: tax.taxRef,
        };
        const savedLine = await deps.quotes.saveLine(line);
        if (!savedLine.ok) return savedLine;
      }

      const event = buildSalesEvent({
        eventType: SalesEventTypes.QuoteRevised,
        aggregateType: "quote",
        aggregateId: quote.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          quoteId: quote.id,
          revisionId,
          companyId: scope.value,
          revisionNumber: nextRevisionNumber,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordSalesAudit(deps.audit, ctx, {
        action: SalesCommandTypes.ReviseQuote,
        entityType: "quote",
        entityId: quote.id,
        outcome: "success",
        details: { revisionId, revisionNumber: nextRevisionNumber },
      });

      return ok({
        quoteId: quote.id,
        revisionId,
        revisionNumber: nextRevisionNumber,
      });
    },
  };
}
