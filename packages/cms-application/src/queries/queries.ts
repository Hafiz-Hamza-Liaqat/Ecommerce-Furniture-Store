/**
 * CMS application queries — no transport DTOs.
 */

import type { Content } from "@afh/cms";
import type { ListQueryRequest } from "@afh/shared-kernel";

export type GetCmsEntryPayload = {
  readonly companyId: string;
  readonly contentId: string;
};

export type ListCmsEntryPayload = ListQueryRequest;

export type GetCmsEntryResult = {
  readonly content: Content;
};
