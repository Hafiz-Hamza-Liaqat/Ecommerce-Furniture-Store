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

export type PolicyPrincipal = {
  readonly userId: string;
  readonly companyId: string | null;
  readonly roles: readonly {
    readonly roleCode: string;
    readonly scopeType: RoleScopeType;
    readonly scopeId: string | null;
  }[];
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

    const roles: {
      roleCode: string;
      scopeType: RoleScopeType;
      scopeId: string | null;
    }[] = [];
    const permissionCodes = new Set<string>();

    for (const assignment of active) {
      const role = await this.store.getRoleById(assignment.roleId);
      if (!role) continue;

      const roleChain = await this.#collectRoleHierarchy(role);
      for (const r of roleChain) {
        roles.push({
          roleCode: r.code,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
        });
        const links = await this.store.listRolePermissions(r.id);
        for (const link of links) {
          const perm = await this.store.getPermissionById(link.permissionId);
          if (perm) {
            permissionCodes.add(perm.code);
          }
        }
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

    if (!this.#scopeAllows(principal, resource)) {
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

  #scopeAllows(principal: PolicyPrincipal, resource: PolicyResource): boolean {
    if (principal.roles.some((r) => r.roleCode === "super_admin")) {
      return true;
    }

    if (
      principal.roles.some(
        (r) => r.scopeType === "company" || r.scopeType === "global",
      )
    ) {
      return true;
    }

    for (const role of principal.roles) {
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
