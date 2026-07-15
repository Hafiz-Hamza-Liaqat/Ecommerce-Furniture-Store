/**
 * Localization contracts — no translation engine.
 */

export type Language = {
  readonly code: string;
  readonly name: string;
};

export type Locale = {
  readonly code: string;
  readonly languageCode: string;
  readonly regionCode: string | null;
  readonly name: string;
};

export type TranslationReference = {
  readonly sourceContentId: string;
  readonly targetContentId: string;
  readonly localeCode: string;
  readonly companyId: string | null;
};
