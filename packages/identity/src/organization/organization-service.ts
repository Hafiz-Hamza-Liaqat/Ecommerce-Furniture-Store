/**
 * Organization membership foundation — no B2B verification workflow.
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
import type { SecurityAuditService } from "../audit/security-audit.js";
import type {
  OrganizationInvitationRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  OrganizationType,
} from "../models/models.js";
import { newId } from "../util/ids.js";

export class OrganizationService {
  constructor(
    private readonly store: IdentityStore,
    private readonly clock: Clock,
    private readonly audit: SecurityAuditService,
  ) {}

  async createOrganization(input: {
    readonly companyId: string;
    readonly type: OrganizationType;
    readonly legalName: string;
    readonly tradeName?: string | null;
    readonly ownerUserId: string;
  }): Promise<Result<OrganizationRecord, PlatformError>> {
    if (!input.legalName.trim()) {
      return fail(
        new ValidationError("legalName required", { code: "legal_name_required" }),
      );
    }
    const now = this.clock.now().toISOString();
    const org: OrganizationRecord = {
      id: newId("org"),
      companyId: input.companyId,
      type: input.type,
      legalName: input.legalName.trim(),
      tradeName: input.tradeName ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveOrganization(org);
    await this.store.saveOrganizationMember({
      id: newId("omem"),
      organizationId: org.id,
      userId: input.ownerUserId,
      memberRole: "owner",
      isOwner: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await this.audit.record({
      companyId: input.companyId,
      actorUserId: input.ownerUserId,
      action: "organization.create",
      entityType: "organization",
      entityId: org.id,
      outcome: "success",
    });
    return ok(org);
  }

  async inviteMember(input: {
    readonly organizationId: string;
    readonly email: string;
    readonly memberRole: string;
    readonly invitedByUserId: string;
    readonly ttlSeconds?: number;
  }): Promise<Result<OrganizationInvitationRecord, PlatformError>> {
    const org = await this.store.getOrganization(input.organizationId);
    if (!org) {
      return fail(
        new NotFoundError("Organization not found", {
          code: "organization_not_found",
        }),
      );
    }
    const now = this.clock.now();
    const invitation: OrganizationInvitationRecord = {
      id: newId("oinv"),
      organizationId: input.organizationId,
      email: input.email.trim().toLowerCase(),
      memberRole: input.memberRole,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      expiresAt: new Date(
        now.getTime() + (input.ttlSeconds ?? 7 * 24 * 60 * 60) * 1000,
      ).toISOString(),
      createdAt: now.toISOString(),
    };
    await this.store.saveInvitation(invitation);
    await this.audit.record({
      companyId: org.companyId,
      actorUserId: input.invitedByUserId,
      action: "organization.invite",
      entityType: "organization_invitation",
      entityId: invitation.id,
      outcome: "success",
    });
    return ok(invitation);
  }

  async acceptInvitation(input: {
    readonly invitationId: string;
    readonly userId: string;
  }): Promise<Result<OrganizationMemberRecord, PlatformError>> {
    const invitation = await this.store.getInvitation(input.invitationId);
    if (!invitation || invitation.status !== "pending") {
      return fail(
        new NotFoundError("Invitation not found", {
          code: "invitation_not_found",
        }),
      );
    }
    if (new Date(invitation.expiresAt) < this.clock.now()) {
      await this.store.saveInvitation({ ...invitation, status: "expired" });
      return fail(
        new ValidationError("Invitation expired", {
          code: "invitation_expired",
        }),
      );
    }

    const existing = await this.store.getOrganizationMember(
      invitation.organizationId,
      input.userId,
    );
    if (existing && existing.status === "active") {
      return fail(
        new ConflictError("Already a member", { code: "already_member" }),
      );
    }

    const now = this.clock.now().toISOString();
    const member: OrganizationMemberRecord = {
      id: existing?.id ?? newId("omem"),
      organizationId: invitation.organizationId,
      userId: input.userId,
      memberRole: invitation.memberRole,
      isOwner: false,
      status: "active",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.store.saveOrganizationMember(member);
    await this.store.saveInvitation({ ...invitation, status: "accepted" });
    return ok(member);
  }

  async revokeMembership(input: {
    readonly organizationId: string;
    readonly userId: string;
    readonly actorUserId: string | null;
  }): Promise<Result<void, PlatformError>> {
    const member = await this.store.getOrganizationMember(
      input.organizationId,
      input.userId,
    );
    if (!member) {
      return ok(undefined);
    }
    await this.store.saveOrganizationMember({
      ...member,
      status: "revoked",
      updatedAt: this.clock.now().toISOString(),
    });
    await this.audit.record({
      companyId: null,
      actorUserId: input.actorUserId,
      action: "organization.member_revoked",
      entityType: "organization_member",
      entityId: member.id,
      outcome: "success",
    });
    return ok(undefined);
  }
}
