/**
 * Search application validators — structural intent only.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import { validationFail, validationOk } from "@afh/shared-kernel";
import type { IndexSearchDocumentPayload } from "../commands/commands.js";
import type { SearchQueryPayload } from "../queries/queries.js";
import { ALLOWED_SEARCH_INDEX_CODES } from "../constants.js";

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

export const indexSearchDocumentCommandValidator: Validator<
  Command<IndexSearchDocumentPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("indexCode", p.indexCode) ??
      requireField("entityType", p.entityType) ??
      requireField("entityId", p.entityId) ??
      validationOk()
    );
  },
};

export const searchQueryValidator: Validator<Query<SearchQueryPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("indexCode", p.indexCode) ??
      validationOk()
    );
  },
};

export function isAllowedSearchIndexCode(indexCode: string): boolean {
  return ALLOWED_SEARCH_INDEX_CODES.has(indexCode);
}
