/**
 * Core identity models — architectural contracts only (Phase 0B / 0E).
 */

export type AccountStatus =
  | "invited"
  | "registered"
  | "active"
  | "suspended"
  | "deactivated";

export type PrincipalKind = "human" | "service_account";

export type UserRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly passwordHash: string | null;
  readonly status: AccountStatus;
  readonly principalKind: PrincipalKind;
  readonly emailVerifiedAt: string | null;
  readonly phoneVerifiedAt: string | null;
  readonly mfaEnabled: boolean;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: string | null;
  readonly locale: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
};

export type PersonProfileRecord = {
  readonly userId: string;
  readonly fullName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type EmployeeRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly userId: string;
  readonly employeeCode: string;
  readonly branchId: string | null;
  readonly department: string | null;
  readonly status: AccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PartnerType =
  | "agent"
  | "interior_designer"
  | "architect"
  | "civil_engineer"
  | "contractor";

export type PartnerProfileRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly userId: string;
  readonly partnerType: PartnerType;
  readonly organizationId: string | null;
  readonly status: AccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OrganizationType =
  | "b2b_buyer"
  | "furniture_shop"
  | "wholesaler"
  | "contractor_firm"
  | "other";

export type OrganizationRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly type: OrganizationType;
  readonly legalName: string;
  readonly tradeName: string | null;
  readonly status: AccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type MembershipStatus = "invited" | "active" | "revoked";

export type OrganizationMemberRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly memberRole: string;
  readonly isOwner: boolean;
  readonly status: MembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type OrganizationInvitationRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly memberRole: string;
  readonly invitedByUserId: string;
  readonly status: "pending" | "accepted" | "revoked" | "expired";
  readonly expiresAt: string;
  readonly createdAt: string;
};

export type ServiceAccountRecord = {
  readonly id: string;
  readonly userId: string;
  readonly companyId: string;
  readonly name: string;
  readonly status: AccountStatus;
  readonly credentialHash: string | null;
  readonly credentialRotatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RoleScopeType =
  | "company"
  | "branch"
  | "organization"
  | "own"
  | "global";

export type PermissionRecord = {
  readonly id: string;
  readonly code: string;
  readonly module: string;
  readonly description: string | null;
};

export type RoleRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly isSystem: boolean;
  readonly parentRoleId: string | null;
};

export type RolePermissionRecord = {
  readonly roleId: string;
  readonly permissionId: string;
};

export type UserRoleRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly scopeType: RoleScopeType;
  readonly scopeId: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
};

export type SessionRecord = {
  readonly id: string;
  readonly userId: string;
  readonly companyId: string | null;
  readonly refreshTokenHash: string;
  readonly deviceLabel: string | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly absoluteExpiresAt: string;
  readonly lastSeenAt: string;
  readonly revokedAt: string | null;
  readonly familyId: string;
};

export type CredentialChallengeKind =
  | "password_reset"
  | "email_verification"
  | "phone_verification"
  | "mfa_challenge";

export type CredentialChallengeRecord = {
  readonly id: string;
  readonly userId: string;
  readonly kind: CredentialChallengeKind;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly createdAt: string;
};
