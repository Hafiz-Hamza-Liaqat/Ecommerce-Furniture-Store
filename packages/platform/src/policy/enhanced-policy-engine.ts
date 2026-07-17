/**
 * Enhanced Policy integration — deepens Phase 2A without a second authz engine.
 * Adds context enrichment + ABAC attribute predicates on top of PolicyEngine.
 */

import type {
  PolicyContext,
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import {
  POLICY_ENGINE_VERSION,
  RBAC_CATALOG_VERSION,
} from "@afh/identity";

export type AttributePredicate = {
  readonly attribute: string;
  readonly operator: "eq" | "neq" | "exists" | "in";
  readonly value?: unknown;
};

export type EnrichedPolicyContext = PolicyContext & {
  readonly approvalPending?: boolean;
  readonly workflowStage?: string | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
};

export type PolicyContextEnricher = (
  principal: PolicyPrincipal,
  action: string,
  resource: PolicyResource,
  context: EnrichedPolicyContext,
) => Promise<EnrichedPolicyContext> | EnrichedPolicyContext;

/**
 * Decorator around an existing PolicyEngine (typically RbacPolicyEngine).
 * Remains the sole authorization path — does not bypass the inner engine.
 */
export class EnhancedPolicyEngine implements PolicyEngine {
  constructor(
    private readonly inner: PolicyEngine,
    private readonly enrichers: readonly PolicyContextEnricher[] = [],
    private readonly requiredAttributes: readonly AttributePredicate[] = [],
    private readonly audit?: SecurityAuditService,
  ) {}

  async evaluate(
    principal: PolicyPrincipal,
    action: string,
    resource: PolicyResource,
    context: PolicyContext = { correlationId: null },
  ): Promise<PolicyDecision> {
    let enriched: EnrichedPolicyContext = { ...context };

    for (const enricher of this.enrichers) {
      enriched = await enricher(principal, action, resource, enriched);
    }

    if (enriched.approvalPending) {
      const deny: PolicyDecision = {
        allowed: false,
        reasonCode: "approval_pending",
        message: "Action blocked while approval is pending",
      };
      await this.audit?.record({
        companyId: principal.companyId,
        actorUserId: principal.userId,
        action: "policy.deny",
        entityType: resource.type,
        entityId: resource.id,
        outcome: "failure",
        details: {
          reasonCode: "approval_pending",
          permission: action,
          decision: "deny",
          engine: "EnhancedPolicyEngine",
          engineVersion: POLICY_ENGINE_VERSION,
          catalogVersion: RBAC_CATALOG_VERSION,
          scopeBinding: "enhanced_precheck",
          contributingRoles: [],
        },
        correlationId: enriched.correlationId,
      });
      return deny;
    }

    const mergedResource: PolicyResource = {
      ...resource,
      attributes: {
        ...(resource.attributes ?? {}),
        ...(enriched.attributes ?? {}),
        ...(enriched.workflowStage
          ? { workflowStage: enriched.workflowStage }
          : {}),
      },
    };

    for (const predicate of this.requiredAttributes) {
      if (!matchesAttribute(mergedResource.attributes ?? {}, predicate)) {
        const deny: PolicyDecision = {
          allowed: false,
          reasonCode: "attribute_mismatch",
          message: `Attribute predicate failed for '${predicate.attribute}'`,
        };
        await this.audit?.record({
          companyId: principal.companyId,
          actorUserId: principal.userId,
          action: "policy.deny",
          entityType: resource.type,
          entityId: resource.id,
          outcome: "failure",
          details: {
            reasonCode: "attribute_mismatch",
            attribute: predicate.attribute,
            permission: action,
            decision: "deny",
            engine: "EnhancedPolicyEngine",
            engineVersion: POLICY_ENGINE_VERSION,
            catalogVersion: RBAC_CATALOG_VERSION,
            scopeBinding: "enhanced_precheck",
            contributingRoles: [],
          },
          correlationId: enriched.correlationId,
        });
        return deny;
      }
    }

    return this.inner.evaluate(principal, action, mergedResource, enriched);
  }
}

export function matchesAttribute(
  attributes: Readonly<Record<string, unknown>>,
  predicate: AttributePredicate,
): boolean {
  const value = attributes[predicate.attribute];
  switch (predicate.operator) {
    case "eq":
      return value === predicate.value;
    case "neq":
      return value !== predicate.value;
    case "exists":
      return value !== undefined && value !== null;
    case "in":
      return Array.isArray(predicate.value) && predicate.value.includes(value);
    default:
      return false;
  }
}

export function featureFlagEnricher(
  flags: Readonly<Record<string, boolean>>,
): PolicyContextEnricher {
  return (_principal, _action, _resource, context) => ({
    ...context,
    featureFlags: { ...(context.featureFlags ?? {}), ...flags },
  });
}
