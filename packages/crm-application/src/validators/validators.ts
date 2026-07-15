/**
 * CRM application validators — intent only.
 * Scoring/qualification/segmentation remain in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  ConvertLeadPayload,
  CreateAccountPayload,
  CreateCampaignPayload,
  CreateContactPayload,
  CreateLeadPayload,
  LogActivityPayload,
  QualifyLeadPayload,
  RecordCommunicationPayload,
  UpdateAccountPayload,
  UpdateCampaignPayload,
  UpdateContactPayload,
  UpdateLeadPayload,
} from "../commands/commands.js";
import type {
  GetAccountPayload,
  GetActivityPayload,
  GetCampaignPayload,
  GetCommunicationPayload,
  GetContactPayload,
  GetCrmSummaryPayload,
  GetLeadPayload,
} from "../queries/queries.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const createLeadCommandValidator: Validator<Command<CreateLeadPayload>> =
  {
    validate(command) {
      return requireField("companyId", command.payload.companyId) ?? validationOk();
    },
  };

export const updateLeadCommandValidator: Validator<Command<UpdateLeadPayload>> =
  {
    validate(command) {
      const p = command.payload;
      const base =
        requireField("companyId", p.companyId) ??
        requireField("leadId", p.leadId);
      if (base) return base;
      if (p.transitionCode && !p.workflowInstanceId) {
        return validationFail([
          {
            field: "workflowInstanceId",
            code: "required",
            message: "workflowInstanceId is required when transitionCode is set",
          },
        ]);
      }
      return validationOk();
    },
  };

export const qualifyLeadCommandValidator: Validator<
  Command<QualifyLeadPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("leadId", p.leadId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when qualifying (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const convertLeadCommandValidator: Validator<
  Command<ConvertLeadPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("leadId", p.leadId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when converting (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const createContactCommandValidator: Validator<
  Command<CreateContactPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("displayName", p.displayName) ??
      validationOk()
    );
  },
};

export const updateContactCommandValidator: Validator<
  Command<UpdateContactPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("contactId", p.contactId) ??
      validationOk()
    );
  },
};

export const createAccountCommandValidator: Validator<
  Command<CreateAccountPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("name", p.name) ??
      validationOk()
    );
  },
};

export const updateAccountCommandValidator: Validator<
  Command<UpdateAccountPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("accountId", p.accountId) ??
      validationOk()
    );
  },
};

export const logActivityCommandValidator: Validator<
  Command<LogActivityPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("activityType", p.activityType) ??
      requireField("subject", p.subject) ??
      validationOk()
    );
  },
};

export const recordCommunicationCommandValidator: Validator<
  Command<RecordCommunicationPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("channel", p.channel) ??
      requireField("direction", p.direction) ??
      validationOk()
    );
  },
};

export const createCampaignCommandValidator: Validator<
  Command<CreateCampaignPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("name", p.name) ??
      validationOk()
    );
  },
};

export const updateCampaignCommandValidator: Validator<
  Command<UpdateCampaignPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("campaignId", p.campaignId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const getLeadQueryValidator: Validator<Query<GetLeadPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("leadId", p.leadId) ??
      validationOk()
    );
  },
};

export const getContactQueryValidator: Validator<Query<GetContactPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("contactId", p.contactId) ??
      validationOk()
    );
  },
};

export const getAccountQueryValidator: Validator<Query<GetAccountPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("accountId", p.accountId) ??
      validationOk()
    );
  },
};

export const getActivityQueryValidator: Validator<Query<GetActivityPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("activityId", p.activityId) ??
      validationOk()
    );
  },
};

export const getCommunicationQueryValidator: Validator<
  Query<GetCommunicationPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("communicationId", p.communicationId) ??
      validationOk()
    );
  },
};

export const getCampaignQueryValidator: Validator<Query<GetCampaignPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("campaignId", p.campaignId) ??
      validationOk()
    );
  },
};

export const getCrmSummaryQueryValidator: Validator<
  Query<GetCrmSummaryPayload>
> = {
  validate(query) {
    return (
      requireField("companyId", query.payload.companyId) ?? validationOk()
    );
  },
};
