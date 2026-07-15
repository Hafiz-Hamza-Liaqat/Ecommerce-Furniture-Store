/**
 * Employee and partner identity links — not trade RBAC roles.
 */

import {
  ConflictError,
  NotFoundError,
  fail,
  ok,
  type Clock,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { IdentityStore } from "../stores/identity-store.js";
import type {
  EmployeeRecord,
  PartnerProfileRecord,
  PartnerType,
} from "../models/models.js";
import { newId } from "../util/ids.js";

export class IdentityProfileService {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
  ) {}

  async linkEmployee(input: {
    readonly companyId: string;
    readonly userId: string;
    readonly employeeCode: string;
    readonly branchId?: string | null;
    readonly department?: string | null;
  }): Promise<Result<EmployeeRecord, PlatformError>> {
    const user = await this.store.getUserById(input.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    const existing = await this.store.getEmployeeByUserId(input.userId);
    if (existing) {
      return fail(
        new ConflictError("Employee already linked", {
          code: "employee_exists",
        }),
      );
    }
    const now = this.clock.now().toISOString();
    const employee: EmployeeRecord = {
      id: newId("emp"),
      companyId: input.companyId,
      userId: input.userId,
      employeeCode: input.employeeCode,
      branchId: input.branchId ?? null,
      department: input.department ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveEmployee(employee);
    return ok(employee);
  }

  async linkPartner(input: {
    readonly companyId: string;
    readonly userId: string;
    readonly partnerType: PartnerType;
    readonly organizationId?: string | null;
  }): Promise<Result<PartnerProfileRecord, PlatformError>> {
    const user = await this.store.getUserById(input.userId);
    if (!user) {
      return fail(new NotFoundError("User not found", { code: "user_not_found" }));
    }
    const existing = await this.store.getPartnerByUserId(input.userId);
    if (existing) {
      return fail(
        new ConflictError("Partner already linked", {
          code: "partner_exists",
        }),
      );
    }
    const now = this.clock.now().toISOString();
    const partner: PartnerProfileRecord = {
      id: newId("partner"),
      companyId: input.companyId,
      userId: input.userId,
      partnerType: input.partnerType,
      organizationId: input.organizationId ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.savePartner(partner);
    return ok(partner);
  }
}
