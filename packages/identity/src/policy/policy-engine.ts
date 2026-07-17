/**
 * Policy Engine — sole runtime authorization decision point (Phase 0A / 0E).
 * RBAC data feeds this engine; services must not implement parallel allow/deny.
 */

import type { Clock } from "@afh/shared-kernel";
import type { IdentityStore } from "../stores/identity-store.js";
import type {
  RoleRecord,
  RoleScopeType,
  UserRoleRecord,
} from "../models/models.js";
import type { SecurityAuditService } from "../audit/security-audit.js";

export type PolicyPrincipalRole = {
  readonly roleCode: string;
  readonly scopeType: RoleScopeType;
  readonly scopeId: string | null;
  /**
   * RC5.8 (ADR D47) — the permission codes this role entry contributed
   * (direct permissions of this chain role under its assignment's scope).
   * `buildPrincipal` always populates it. When absent on every entry the
   * principal is treated as legacy and the pre-RC5.8 union behavior applies;
   * when any entry carries it, entries without it grant nothing (strict).
   */
  readonly permissionCodes?: readonly string[];
};

export type PolicyPrincipal = {
  readonly userId: string;
  readonly companyId: string | null;
  readonly roles: readonly PolicyPrincipalRole[];
  /** Flat presentation union of all entries — never used for scope binding. */
  readonly permissionCodes: readonly string[];
};

export type PolicyResource = {
  readonly type: string;
  readonly id: string | null;
  readonly companyId: string | null;
  readonly ownerUserId: string | null;
  readonly organizationId: string | null;
  readonly branchId: string | null;
  readonly attributes?: Readonly<Record<string, unknown>>;
};

export type PolicyContext = {
  readonly correlationId: string | null;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
  readonly now?: Date;
};

export type PolicyDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reasonCode: string;
      readonly message: string;
    };

export interface PolicyEngine {
  evaluate(
    principal: PolicyPrincipal,
    action: string,
    resource: PolicyResource,
    context?: PolicyContext,
  ): Promise<PolicyDecision>;
}

export class RbacPolicyEngine implements PolicyEngine {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit?: SecurityAuditService,
  ) {}

  async buildPrincipal(userId: string): Promise<PolicyPrincipal | null> {
    const user = await this.store.getUserById(userId);
    if (!user || user.status !== "active") {
      return null;
    }

    const assignments = await this.store.listUserRoles(userId);
    const now = this.clock.now();
    const active = assignments.filter((a) => isAssignmentActive(a, now));

    const roles: PolicyPrincipalRole[] = [];
    const permissionCodes = new Set<string>();

    for (const assignment of active) {
      const role = await this.store.getRoleById(assignment.roleId);
      if (!role) continue;

      const roleChain = await this.#collectRoleHierarchy(role);
      for (const r of roleChain) {
        const entryCodes: string[] = [];
        const links = await this.store.listRolePermissions(r.id);
        for (const link of links) {
          const perm = await this.store.getPermissionById(link.permissionId);
          if (perm) {
            entryCodes.push(perm.code);
            permissionCodes.add(perm.code);
          }
        }
        roles.push({
          roleCode: r.code,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
          // RC5.8 (ADR D47): bind this entry's grants to its assignment scope.
          permissionCodes: entryCodes,
        });
      }
    }

    return {
      userId: user.id,
      companyId: user.companyId,
      roles,
      permissionCodes: [...permissionCodes],
    };
  }

  async evaluate(
    principal: PolicyPrincipal,
    action: string,
    resource: PolicyResource,
    context: PolicyContext = { correlationId: null },
  ): Promise<PolicyDecision> {
    if (!principal.permissionCodes.includes(action)) {
      const deny = {
        allowed: false as const,
        reasonCode: "permission_missing",
        message: `Permission '${action}' not granted`,
      };
      await this.#auditDeny(
        principal,
        action,
        resource,
        context,
        deny.reasonCode,
      );
      return deny;
    }

    if (
      resource.companyId !== null &&
      principal.companyId !== null &&
      resource.companyId !== principal.companyId
    ) {
      const deny = {
        allowed: false as const,
        reasonCode: "company_isolation",
        message: "Cross-company access denied",
      };
      await this.#auditDeny(
        principal,
        action,
        resource,
        context,
        deny.reasonCode,
      );
      return deny;
    }

    if (!this.#scopeAllows(principal, action, resource)) {
      const deny = {
        allowed: false as const,
        reasonCode: "scope_mismatch",
        message: "Resource outside assigned scopes",
      };
      await this.#auditDeny(
        principal,
        action,
        resource,
        context,
        deny.reasonCode,
      );
      return deny;
    }

    return { allowed: true };
  }

  /**
   * RC5.8 (ADR D47) — permission-to-scope binding: only role entries that
   * actually granted `action` can satisfy the scope gate, so a company- or
   * global-scoped assignment no longer widens the scope of a permission it
   * did not contribute.
   *
   * Backward compatibility: principals whose role entries carry no per-entry
   * `permissionCodes` (built before RC5.8 or constructed manually) keep the
   * pre-RC5.8 behavior — every entry is considered. When any entry carries
   * per-entry data, entries without it grant nothing (fail-closed for
   * partially populated principals).
   */
  #scopeAllows(
    principal: PolicyPrincipal,
    action: string,
    resource: PolicyResource,
  ): boolean {
    const bound = principal.roles.some((r) => r.permissionCodes !== undefined);
    const granting = bound
      ? principal.roles.filter((r) =>
          r.permissionCodes?.includes(action) ?? false,
        )
      : principal.roles;

    if (granting.some((r) => r.roleCode === "super_admin")) {
      return true;
    }

    if (
      granting.some(
        (r) => r.scopeType === "company" || r.scopeType === "global",
      )
    ) {
      return true;
    }

    for (const role of granting) {
      if (
        role.scopeType === "own" &&
        resource.ownerUserId !== null &&
        resource.ownerUserId === principal.userId
      ) {
        return true;
      }
      if (
        role.scopeType === "organization" &&
        role.scopeId !== null &&
        resource.organizationId !== null &&
        role.scopeId === resource.organizationId
      ) {
        return true;
      }
      if (
        role.scopeType === "branch" &&
        role.scopeId !== null &&
        resource.branchId !== null &&
        role.scopeId === resource.branchId
      ) {
        return true;
      }
    }

    return false;
  }

  async #collectRoleHierarchy(role: RoleRecord): Promise<RoleRecord[]> {
    const chain: RoleRecord[] = [role];
    let current: RoleRecord | null = role;
    const guard = new Set<string>([role.id]);
    while (current?.parentRoleId) {
      const parent: RoleRecord | null = await this.store.getRoleById(
        current.parentRoleId,
      );
      if (!parent || guard.has(parent.id)) {
        break;
      }
      guard.add(parent.id);
      chain.push(parent);
      current = parent;
    }
    return chain;
  }

  async #auditDeny(
    principal: PolicyPrincipal,
    action: string,
    resource: PolicyResource,
    context: PolicyContext,
    reasonCode: string,
  ): Promise<void> {
    await this.audit?.record({
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action: "policy.deny",
      entityType: resource.type,
      entityId: resource.id,
      outcome: "failure",
      details: { permission: action, reasonCode },
      correlationId: context.correlationId,
    });
  }
}

function isAssignmentActive(assignment: UserRoleRecord, now: Date): boolean {
  const from = new Date(assignment.validFrom);
  if (from.getTime() > now.getTime()) {
    return false;
  }
  if (assignment.validTo === null) {
    return true;
  }
  return new Date(assignment.validTo).getTime() >= now.getTime();
}
