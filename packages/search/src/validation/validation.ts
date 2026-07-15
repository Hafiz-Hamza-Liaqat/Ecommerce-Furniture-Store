/**
 * Search validation — structural only.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type {
  SearchDocument,
  SearchIndexDefinition,
} from "../models/models.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const searchIndexDefinitionStructureValidator: Validator<SearchIndexDefinition> =
  {
    validate(input: SearchIndexDefinition): ValidationOutcome {
      return (
        requireNonEmpty("id", input.id) ??
        requireNonEmpty("code", input.code) ??
        requireNonEmpty("name", input.name) ??
        validationOk()
      );
    },
  };

export const searchDocumentStructureValidator: Validator<SearchDocument> = {
  validate(input: SearchDocument): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("indexCode", input.indexCode) ??
      requireNonEmpty("entityType", input.entityType) ??
      requireNonEmpty("entityId", input.entityId) ??
      validationOk()
    );
  },
};

export type SearchValidators = {
  readonly indexDefinition: Validator<SearchIndexDefinition>;
  readonly document: Validator<SearchDocument>;
};

export function createSearchValidators(): SearchValidators {
  return {
    indexDefinition: searchIndexDefinitionStructureValidator,
    document: searchDocumentStructureValidator,
  };
}
