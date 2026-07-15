/**
 * CMS validation — structural only. No business validation.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Content } from "../content/content.js";
import type { Menu, MenuItem } from "../navigation/navigation.js";
import type { ContentCategory } from "../taxonomy/taxonomy.js";
import type { ContentRevisionMetadata } from "../versioning/versioning.js";
import type { SeoMetadata } from "../seo/seo.js";

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

export const contentStructureValidator: Validator<Content> = {
  validate(input: Content): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("slug", input.slug) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const menuStructureValidator: Validator<Menu> = {
  validate(input: Menu): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const menuItemStructureValidator: Validator<MenuItem> = {
  validate(input: MenuItem): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("menuId", input.menuId) ??
      requireNonEmpty("label", input.label) ??
      validationOk()
    );
  },
};

export const categoryStructureValidator: Validator<ContentCategory> = {
  validate(input: ContentCategory): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const revisionStructureValidator: Validator<ContentRevisionMetadata> = {
  validate(input: ContentRevisionMetadata): ValidationOutcome {
    if (input.revisionNumber < 1) {
      return validationFail([
        {
          field: "revisionNumber",
          code: "invalid",
          message: "revisionNumber must be >= 1",
        },
      ]);
    }
    return (
      requireNonEmpty("revisionId", input.revisionId) ??
      requireNonEmpty("contentId", input.contentId) ??
      validationOk()
    );
  },
};

export const seoStructureValidator: Validator<SeoMetadata> = {
  validate(input: SeoMetadata): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("contentId", input.contentId) ??
      validationOk()
    );
  },
};

export type CmsValidators = {
  readonly content: Validator<Content>;
  readonly menu: Validator<Menu>;
  readonly menuItem: Validator<MenuItem>;
  readonly category: Validator<ContentCategory>;
  readonly revision: Validator<ContentRevisionMetadata>;
  readonly seo: Validator<SeoMetadata>;
};

export function createCmsValidators(): CmsValidators {
  return {
    content: contentStructureValidator,
    menu: menuStructureValidator,
    menuItem: menuItemStructureValidator,
    category: categoryStructureValidator,
    revision: revisionStructureValidator,
    seo: seoStructureValidator,
  };
}
