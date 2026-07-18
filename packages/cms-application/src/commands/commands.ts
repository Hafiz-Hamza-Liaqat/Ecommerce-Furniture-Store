/**
 * CMS application commands — no transport DTOs.
 */

export type CreateCmsEntryPayload = {
  readonly companyId: string;
  readonly kind: string;
  readonly slug: string;
  readonly title: string;
  readonly summary?: string | null;
  readonly bodyRef?: string | null;
  readonly localeCode?: string | null;
  /** true publishes immediately; omitted/false leaves the entry as draft. */
  readonly publish?: boolean;
};

export type UpdateCmsEntryPayload = {
  readonly companyId: string;
  readonly contentId: string;
  readonly title?: string;
  readonly summary?: string | null;
  readonly bodyRef?: string | null;
  readonly localeCode?: string | null;
  readonly publish?: boolean;
};
