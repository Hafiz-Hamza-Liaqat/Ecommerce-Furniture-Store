/**
 * RC5.9 — Stable authorization reason-code catalog.
 *
 * These codes are the frozen strings emitted by Policy / application
 * authorization helpers. Changing a code is a breaking observability change
 * and requires an ADR. The catalog documents existing codes; it does not
 * invent a new authorization model.
 */

/** Deny reasons emitted by RbacPolicyEngine.evaluate. */
export const POLICY_ENGINE_DENY_REASON_CODES = [
  "permission_missing",
  "company_isolation",
  "scope_mismatch",
] as const;

/** Deny reasons emitted by EnhancedPolicyEngine before the inner engine. */
export const ENHANCED_POLICY_DENY_REASON_CODES = [
  "approval_pending",
  "attribute_mismatch",
] as const;

/**
 * Application-layer authorization / field / list-filter reason codes.
 * Emitted outside the Policy Engine but part of the stable authz vocabulary.
 */
export const APPLICATION_AUTHZ_REASON_CODES = [
  "unauthenticated",
  "principal_missing",
  "policy_evaluation_failed",
  "field_read_denied",
  "field_update_denied",
] as const;

export type PolicyEngineDenyReasonCode =
  (typeof POLICY_ENGINE_DENY_REASON_CODES)[number];
export type EnhancedPolicyDenyReasonCode =
  (typeof ENHANCED_POLICY_DENY_REASON_CODES)[number];
export type ApplicationAuthzReasonCode =
  (typeof APPLICATION_AUTHZ_REASON_CODES)[number];

export const ALL_AUTHZ_REASON_CODES = [
  ...POLICY_ENGINE_DENY_REASON_CODES,
  ...ENHANCED_POLICY_DENY_REASON_CODES,
  ...APPLICATION_AUTHZ_REASON_CODES,
] as const;

export type AuthzReasonCode = (typeof ALL_AUTHZ_REASON_CODES)[number];

const POLICY_ENGINE_SET = new Set<string>(POLICY_ENGINE_DENY_REASON_CODES);
const ALL_SET = new Set<string>(ALL_AUTHZ_REASON_CODES);

export function isPolicyEngineDenyReasonCode(code: string): boolean {
  return POLICY_ENGINE_SET.has(code);
}

export function isKnownAuthzReasonCode(code: string): boolean {
  return ALL_SET.has(code);
}

/** Engine identity stamped onto every Policy decision audit record. */
export const POLICY_ENGINE_NAME = "RbacPolicyEngine";
export const POLICY_ENGINE_VERSION = "rc5.9";
