import type { CommandHandler } from "@afh/application";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import type { Account, Contact } from "@afh/crm";
import { CrmEventTypes } from "@afh/crm";
import {
  CrmCommandTypes,
  CrmPolicyActions,
  CrmRuleSetCodes,
} from "../constants.js";
import type {
  CreateAccountPayload,
  CreateContactPayload,
  UpdateAccountPayload,
  UpdateContactPayload,
} from "../commands/commands.js";
import {
  createAccountCommandValidator,
  createContactCommandValidator,
  updateAccountCommandValidator,
  updateContactCommandValidator,
} from "../validators/validators.js";
import type { CrmHandlerDeps } from "./deps.js";
import {
  buildCrmEvent,
  commandCausationId,
  companyResource,
  loadRecordForAuthorization,
  enqueueDomainEvent,
  invokeCrmRules,
  newEntityId,
  recordCrmAudit,
  requireCompanyId,
} from "../support/support.js";

export function createCreateContactHandler(
  deps: CrmHandlerDeps,
): CommandHandler<CreateContactPayload, { contactId: string }> {
  return {
    commandType: CrmCommandTypes.CreateContact,
    authorize(command) {
      return companyResource(
        "contact",
        CrmPolicyActions.ContactCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createContactCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const segmentation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.Segmentation,
        {
          companyId: scope.value,
          contactType: command.payload.contactType ?? "person",
          accountId: command.payload.accountId ?? null,
        },
      );
      if (!segmentation.ok) return segmentation;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const contact: Contact = {
        id,
        companyId: scope.value,
        displayName: p.displayName,
        contactType: p.contactType ?? "person",
        email: p.email ?? null,
        phone: p.phone ?? null,
        userId: p.userId ?? null,
        accountId: p.accountId ?? null,
        leadId: p.leadId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.contacts.save(contact);
      if (!saved.ok) return saved;

      const event = buildCrmEvent({
        eventType: CrmEventTypes.ContactCreated,
        aggregateType: "contact",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: { contactId: id, companyId: scope.value },
        sensitivity: "pii",
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.CreateContact,
        entityType: "contact",
        entityId: id,
        outcome: "success",
      });

      return ok({ contactId: id });
    },
  };
}

export function createUpdateContactHandler(
  deps: CrmHandlerDeps,
): CommandHandler<UpdateContactPayload, { contactId: string }> {
  return {
    commandType: CrmCommandTypes.UpdateContact,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.contacts.findById({ companyId: p.companyId, id: p.contactId }),
      );
      return companyResource(
        "contact",
        CrmPolicyActions.ContactUpdate,
        p.companyId,
        p.contactId,
        {
          ownerUserId: record?.userId ?? null,
          attributes: {
            accountId: record?.accountId ?? null,
            leadId: record?.leadId ?? null,
          },
        },
      );
    },
    validate() {
      return updateContactCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.contacts.findById({
        companyId: scope.value,
        id: command.payload.contactId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Contact not found", { code: "contact_not_found" }),
        );
      }

      const p = command.payload;
      const now = ctx.clock.now().toISOString();
      const updated: Contact = {
        ...existing.value,
        displayName: p.displayName ?? existing.value.displayName,
        contactType: p.contactType ?? existing.value.contactType,
        email: p.email !== undefined ? p.email : existing.value.email,
        phone: p.phone !== undefined ? p.phone : existing.value.phone,
        userId: p.userId !== undefined ? p.userId : existing.value.userId,
        accountId:
          p.accountId !== undefined ? p.accountId : existing.value.accountId,
        leadId: p.leadId !== undefined ? p.leadId : existing.value.leadId,
        updatedAt: now,
      };

      const saved = await deps.contacts.save(updated);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.UpdateContact,
        entityType: "contact",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ contactId: updated.id });
    },
  };
}

export function createCreateAccountHandler(
  deps: CrmHandlerDeps,
): CommandHandler<CreateAccountPayload, { accountId: string }> {
  return {
    commandType: CrmCommandTypes.CreateAccount,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "account",
        CrmPolicyActions.AccountCreate,
        p.companyId,
        null,
        {
          ownerUserId: p.ownerUserId ?? null,
          organizationId: p.identityOrganizationId ?? null,
          attributes: { primaryContactId: p.primaryContactId ?? null },
        },
      );
    },
    validate() {
      return createAccountCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const segmentation = await invokeCrmRules(
        ctx,
        CrmRuleSetCodes.Segmentation,
        {
          companyId: scope.value,
          accountType: command.payload.accountType ?? "prospect",
          name: command.payload.name,
        },
      );
      if (!segmentation.ok) return segmentation;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();
      const p = command.payload;

      const account: Account = {
        id,
        companyId: scope.value,
        code: p.code ?? null,
        name: p.name,
        accountType: p.accountType ?? "prospect",
        identityOrganizationId: p.identityOrganizationId ?? null,
        primaryContactId: p.primaryContactId ?? null,
        ownerUserId: p.ownerUserId ?? ctx.userId,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.accounts.save(account);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.CreateAccount,
        entityType: "account",
        entityId: id,
        outcome: "success",
      });

      return ok({ accountId: id });
    },
  };
}

export function createUpdateAccountHandler(
  deps: CrmHandlerDeps,
): CommandHandler<UpdateAccountPayload, { accountId: string }> {
  return {
    commandType: CrmCommandTypes.UpdateAccount,
    async authorize(command) {
      const p = command.payload;
      const record = await loadRecordForAuthorization(() =>
        deps.accounts.findById({ companyId: p.companyId, id: p.accountId }),
      );
      return companyResource(
        "account",
        CrmPolicyActions.AccountUpdate,
        p.companyId,
        p.accountId,
        {
          ownerUserId: record?.ownerUserId ?? null,
          organizationId: record?.identityOrganizationId ?? null,
          attributes: { primaryContactId: record?.primaryContactId ?? null },
        },
      );
    },
    validate() {
      return updateAccountCommandValidator;
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
          new NotFoundError("Account not found", { code: "account_not_found" }),
        );
      }

      const p = command.payload;
      const now = ctx.clock.now().toISOString();
      const updated: Account = {
        ...existing.value,
        name: p.name ?? existing.value.name,
        code: p.code !== undefined ? p.code : existing.value.code,
        accountType: p.accountType ?? existing.value.accountType,
        identityOrganizationId:
          p.identityOrganizationId !== undefined
            ? p.identityOrganizationId
            : existing.value.identityOrganizationId,
        primaryContactId:
          p.primaryContactId !== undefined
            ? p.primaryContactId
            : existing.value.primaryContactId,
        ownerUserId:
          p.ownerUserId !== undefined
            ? p.ownerUserId
            : existing.value.ownerUserId,
        updatedAt: now,
      };

      const saved = await deps.accounts.save(updated);
      if (!saved.ok) return saved;

      await recordCrmAudit(deps.audit, ctx, {
        action: CrmCommandTypes.UpdateAccount,
        entityType: "account",
        entityId: updated.id,
        outcome: "success",
      });

      return ok({ accountId: updated.id });
    },
  };
}
