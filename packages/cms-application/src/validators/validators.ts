/**
 * CMS application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type {
  CreateCmsEntryPayload,
  UpdateCmsEntryPayload,
} from "../commands/commands.js";
import type { GetCmsEntryPayload, ListCmsEntryPayload } from "../queries/queries.js";

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

export const createCmsEntryCommandValidator: Validator<
  Command<CreateCmsEntryPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("kind", p.kind) ??
      requireField("slug", p.slug) ??
      requireField("title", p.title) ??
      validationOk()
    );
  },
};

export const updateCmsEntryCommandValidator: Validator<
  Command<UpdateCmsEntryPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("contentId", p.contentId) ??
      validationOk()
    );
  },
};

export const getCmsEntryQueryValidator: Validator<Query<GetCmsEntryPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("contentId", p.contentId) ??
      validationOk()
    );
  },
};

export const listCmsEntryQueryValidator: Validator<Query<ListCmsEntryPayload>> = {
  validate(query) {
    const p = query.payload;
    return requireField("companyId", p.companyId) ?? validationOk();
  },
};
