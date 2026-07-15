/**
 * RBAC foundation — roles, permissions, scoped/temporary assignments.
 * No business-specific permission logic.
 */

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { IdentityStore } from "../stores/identity-store.js";
import type {
  PermissionRecord,
  RoleRecord,
  RoleScopeType,
  UserRoleRecord,
} from "../models/models.js";
import type { SecurityAuditService } from "../audit/security-audit.js";
import { newId } from "../util/ids.js";

export class RbacService {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async definePermission(input: {
    code: string;
    module: string;
    description?: string | null;
  }): Promise<Result<PermissionRecord, PlatformError>> {
    const existing = await this.store.getPermissionByCode(input.code);
    if (existing) {
      return fail(
        new ConflictError("Permission already exists", {
          code: "permission_exists",
          details: { code: input.code },
        }),
      );
    }
    const permission: PermissionRecord = {
      id: newId("perm"),
      code: input.code,
      module: input.module,
      description: input.description ?? null,
    };
    await this.store.savePermission(permission);
    return ok(permission);
  }

  async defineRole(input: {
    companyId: string | null;
    code: string;
    name: string;
    isSystem?: boolean;
    parentRoleId?: string | null;
  }): Promise<Result<RoleRecord, PlatformError>> {
    const existing = await this.store.getRoleByCode(
      input.companyId,
      input.code,
    );
    if (existing) {
      return fail(
        new ConflictError("Role already exists", {
          code: "role_exists",
          details: { code: input.code },
        }),
      );
    }
    if (input.parentRoleId) {
      const parent = await this.store.getRoleById(input.parentRoleId);
      if (!parent) {
        return fail(
          new NotFoundError("Parent role not found", {
            code: "parent_role_not_found",
          }),
        );
      }
    }
    const role: RoleRecord = {
      id: newId("role"),
      companyId: input.companyId,
      code: input.code,
      name: input.name,
      isSystem: input.isSystem ?? false,
      parentRoleId: input.parentRoleId ?? null,
    };
    await this.store.saveRole(role);
    return ok(role);
  }

  async grantPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<Result<void, PlatformError>> {
    const role = await this.store.getRoleById(roleId);
    if (!role) {
      return fail(new NotFoundError("Role not found", { code: "role_not_found" }));
    }
    const permission = await this.store.getPermissionById(permissionId);
    if (!permission) {
      return fail(
        new NotFoundError("Permission not found", {
          code: "permission_not_found",
        }),
      );
    }
    await this.store.saveRolePermission({ roleId, permissionId });
    return ok(undefined);
  }

  async assignRole(input: {
    companyId: string;
    userId: string;
    roleId: string;
    scopeType: RoleScopeType;
    scopeId?: string | null;
    validFrom?: string;
    validTo?: string | null;
    actorUserId?: string | null;
  }): Promise<Result<UserRoleRecord, PlatformError>> {
    const user = await this.store.getUserById(input.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    const role = await this.store.getRoleById(input.roleId);
    if (!role) {
      return fail(new NotFoundError("Role not found", { code: "role_not_found" }));
    }
    if (
      (input.scopeType === "branch" || input.scopeType === "organization") &&
      !input.scopeId
    ) {
      return fail(
        new ValidationError("scopeId required for branch/organization scope", {
          code: "scope_id_required",
        }),
      );
    }

    const assignment: UserRoleRecord = {
      id: newId("urole"),
      companyId: input.companyId,
      userId: input.userId,
      roleId: input.roleId,
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? null,
      validFrom: input.validFrom ?? this.clock.now().toISOString(),
      validTo: input.validTo ?? null,
    };
    await this.store.saveUserRole(assignment);
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId ?? null,
      action: "rbac.role_assigned",
      entityType: "user_role",
      entityId: assignment.id,
      outcome: "success",
      details: {
        userId: input.userId,
        roleId: input.roleId,
        scopeType: input.scopeType,
        temporary: assignment.validTo !== null,
      },
    });
    return ok(assignment);
  }

  async revokeRoleAssignment(
    assignmentId: string,
    actorUserId: string | null,
  ): Promise<Result<void, PlatformError>> {
    await this.store.removeUserRole(assignmentId);
    await this.audit.record({
      companyId: null,
      actorUserId,
      action: "rbac.role_revoked",
      entityType: "user_role",
      entityId: assignmentId,
      outcome: "success",
    });
    return ok(undefined);
  }
}
