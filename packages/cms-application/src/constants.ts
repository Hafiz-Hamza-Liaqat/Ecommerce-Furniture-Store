/**
 * CMS application constants.
 */

export const CmsCommandTypes = {
  CreateCmsEntry: "cms.CreateCmsEntry",
  UpdateCmsEntry: "cms.UpdateCmsEntry",
} as const;

export const CmsQueryTypes = {
  GetCmsEntry: "cms.GetCmsEntry",
  ListCmsEntry: "cms.ListCmsEntry",
} as const;

export const CmsPolicyActions = {
  ContentCreate: "cms.content.create",
  ContentUpdate: "cms.content.update",
  ContentRead: "cms.content.read",
} as const;

/** Known content kinds — unrecognized input falls back to "page". */
export const KNOWN_CONTENT_KINDS = [
  "page",
  "article",
  "news",
  "announcement",
  "landing_page",
  "static",
  "policy",
  "faq",
  "knowledge_base",
  "other",
] as const;
