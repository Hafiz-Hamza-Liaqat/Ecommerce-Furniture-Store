/**
 * Identity persistence ports + in-memory adapter (domain-neutral).
 */

import type {
  CredentialChallengeRecord,
  EmployeeRecord,
  OrganizationInvitationRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  PartnerProfileRecord,
  PermissionRecord,
  PersonProfileRecord,
  RolePermissionRecord,
  RoleRecord,
  ServiceAccountRecord,
  SessionRecord,
  UserRecord,
  UserRoleRecord,
} from "../models/models.js";

export interface IdentityStore {
  // users
  getUserById(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  saveUser(user: UserRecord): Promise<void>;

  getProfile(userId: string): Promise<PersonProfileRecord | null>;
  saveProfile(profile: PersonProfileRecord): Promise<void>;

  getEmployeeByUserId(userId: string): Promise<EmployeeRecord | null>;
  saveEmployee(employee: EmployeeRecord): Promise<void>;

  getPartnerByUserId(userId: string): Promise<PartnerProfileRecord | null>;
  savePartner(partner: PartnerProfileRecord): Promise<void>;

  getOrganization(id: string): Promise<OrganizationRecord | null>;
  saveOrganization(org: OrganizationRecord): Promise<void>;

  listOrganizationMembers(
    organizationId: string,
  ): Promise<readonly OrganizationMemberRecord[]>;
  getOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRecord | null>;
  saveOrganizationMember(member: OrganizationMemberRecord): Promise<void>;

  saveInvitation(invitation: OrganizationInvitationRecord): Promise<void>;
  getInvitation(id: string): Promise<OrganizationInvitationRecord | null>;

  getServiceAccount(id: string): Promise<ServiceAccountRecord | null>;
  getServiceAccountByUserId(
    userId: string,
  ): Promise<ServiceAccountRecord | null>;
  saveServiceAccount(account: ServiceAccountRecord): Promise<void>;

  // rbac
  getPermissionByCode(code: string): Promise<PermissionRecord | null>;
  getPermissionById(id: string): Promise<PermissionRecord | null>;
  savePermission(permission: PermissionRecord): Promise<void>;
  getRoleById(id: string): Promise<RoleRecord | null>;
  getRoleByCode(
    companyId: string | null,
    code: string,
  ): Promise<RoleRecord | null>;
  saveRole(role: RoleRecord): Promise<void>;
  listRolePermissions(roleId: string): Promise<readonly RolePermissionRecord[]>;
  saveRolePermission(link: RolePermissionRecord): Promise<void>;
  listUserRoles(userId: string): Promise<readonly UserRoleRecord[]>;
  saveUserRole(assignment: UserRoleRecord): Promise<void>;
  removeUserRole(assignmentId: string): Promise<void>;

  // sessions / challenges
  getSession(id: string): Promise<SessionRecord | null>;
  listSessionsByUser(userId: string): Promise<readonly SessionRecord[]>;
  saveSession(session: SessionRecord): Promise<void>;
  saveChallenge(challenge: CredentialChallengeRecord): Promise<void>;
  getChallenge(id: string): Promise<CredentialChallengeRecord | null>;
  findChallengeByTokenHash(
    kind: string,
    tokenHash: string,
  ): Promise<CredentialChallengeRecord | null>;
}

export class InMemoryIdentityStore implements IdentityStore {
  readonly users = new Map<string, UserRecord>();
  readonly usersByEmail = new Map<string, string>();
  readonly profiles = new Map<string, PersonProfileRecord>();
  readonly employees = new Map<string, EmployeeRecord>();
  readonly employeesByUser = new Map<string, string>();
  readonly partners = new Map<string, PartnerProfileRecord>();
  readonly partnersByUser = new Map<string, string>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly members = new Map<string, OrganizationMemberRecord>();
  readonly invitations = new Map<string, OrganizationInvitationRecord>();
  readonly serviceAccounts = new Map<string, ServiceAccountRecord>();
  readonly serviceAccountsByUser = new Map<string, string>();
  readonly permissions = new Map<string, PermissionRecord>();
  readonly permissionsByCode = new Map<string, string>();
  readonly roles = new Map<string, RoleRecord>();
  readonly rolePermissions = new Map<string, RolePermissionRecord[]>();
  readonly userRoles = new Map<string, UserRoleRecord[]>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly challenges = new Map<string, CredentialChallengeRecord>();

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const id = this.usersByEmail.get(email.toLowerCase());
    return id ? (this.users.get(id) ?? null) : null;
  }

  async saveUser(user: UserRecord): Promise<void> {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user.id);
  }

  async getProfile(userId: string): Promise<PersonProfileRecord | null> {
    return this.profiles.get(userId) ?? null;
  }

  async saveProfile(profile: PersonProfileRecord): Promise<void> {
    this.profiles.set(profile.userId, profile);
  }

  async getEmployeeByUserId(userId: string): Promise<EmployeeRecord | null> {
    const id = this.employeesByUser.get(userId);
    return id ? (this.employees.get(id) ?? null) : null;
  }

  async saveEmployee(employee: EmployeeRecord): Promise<void> {
    this.employees.set(employee.id, employee);
    this.employeesByUser.set(employee.userId, employee.id);
  }

  async getPartnerByUserId(
    userId: string,
  ): Promise<PartnerProfileRecord | null> {
    const id = this.partnersByUser.get(userId);
    return id ? (this.partners.get(id) ?? null) : null;
  }

  async savePartner(partner: PartnerProfileRecord): Promise<void> {
    this.partners.set(partner.id, partner);
    this.partnersByUser.set(partner.userId, partner.id);
  }

  async getOrganization(id: string): Promise<OrganizationRecord | null> {
    return this.organizations.get(id) ?? null;
  }

  async saveOrganization(org: OrganizationRecord): Promise<void> {
    this.organizations.set(org.id, org);
  }

  async listOrganizationMembers(
    organizationId: string,
  ): Promise<readonly OrganizationMemberRecord[]> {
    return [...this.members.values()].filter(
      (m) => m.organizationId === organizationId,
    );
  }

  async getOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRecord | null> {
    return (
      [...this.members.values()].find(
        (m) => m.organizationId === organizationId && m.userId === userId,
      ) ?? null
    );
  }

  async saveOrganizationMember(
    member: OrganizationMemberRecord,
  ): Promise<void> {
    this.members.set(member.id, member);
  }

  async saveInvitation(
    invitation: OrganizationInvitationRecord,
  ): Promise<void> {
    this.invitations.set(invitation.id, invitation);
  }

  async getInvitation(
    id: string,
  ): Promise<OrganizationInvitationRecord | null> {
    return this.invitations.get(id) ?? null;
  }

  async getServiceAccount(id: string): Promise<ServiceAccountRecord | null> {
    return this.serviceAccounts.get(id) ?? null;
  }

  async getServiceAccountByUserId(
    userId: string,
  ): Promise<ServiceAccountRecord | null> {
    const id = this.serviceAccountsByUser.get(userId);
    return id ? (this.serviceAccounts.get(id) ?? null) : null;
  }

  async saveServiceAccount(account: ServiceAccountRecord): Promise<void> {
    this.serviceAccounts.set(account.id, account);
    this.serviceAccountsByUser.set(account.userId, account.id);
  }

  async getPermissionByCode(code: string): Promise<PermissionRecord | null> {
    const id = this.permissionsByCode.get(code);
    return id ? (this.permissions.get(id) ?? null) : null;
  }

  async getPermissionById(id: string): Promise<PermissionRecord | null> {
    return this.permissions.get(id) ?? null;
  }

  async savePermission(permission: PermissionRecord): Promise<void> {
    this.permissions.set(permission.id, permission);
    this.permissionsByCode.set(permission.code, permission.id);
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    return this.roles.get(id) ?? null;
  }

  async getRoleByCode(
    companyId: string | null,
    code: string,
  ): Promise<RoleRecord | null> {
    return (
      [...this.roles.values()].find(
        (r) => r.companyId === companyId && r.code === code,
      ) ??
      [...this.roles.values()].find(
        (r) => r.companyId === null && r.code === code,
      ) ??
      null
    );
  }

  async saveRole(role: RoleRecord): Promise<void> {
    this.roles.set(role.id, role);
  }

  async listRolePermissions(
    roleId: string,
  ): Promise<readonly RolePermissionRecord[]> {
    return this.rolePermissions.get(roleId) ?? [];
  }

  async saveRolePermission(link: RolePermissionRecord): Promise<void> {
    const existing = this.rolePermissions.get(link.roleId) ?? [];
    this.rolePermissions.set(link.roleId, [...existing, link]);
  }

  async listUserRoles(userId: string): Promise<readonly UserRoleRecord[]> {
    return this.userRoles.get(userId) ?? [];
  }

  async saveUserRole(assignment: UserRoleRecord): Promise<void> {
    const existing = this.userRoles.get(assignment.userId) ?? [];
    const filtered = existing.filter((a) => a.id !== assignment.id);
    this.userRoles.set(assignment.userId, [...filtered, assignment]);
  }

  async removeUserRole(assignmentId: string): Promise<void> {
    for (const [userId, list] of this.userRoles) {
      this.userRoles.set(
        userId,
        list.filter((a) => a.id !== assignmentId),
      );
    }
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    return this.sessions.get(id) ?? null;
  }

  async listSessionsByUser(
    userId: string,
  ): Promise<readonly SessionRecord[]> {
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }

  async saveSession(session: SessionRecord): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async saveChallenge(challenge: CredentialChallengeRecord): Promise<void> {
    this.challenges.set(challenge.id, challenge);
  }

  async getChallenge(
    id: string,
  ): Promise<CredentialChallengeRecord | null> {
    return this.challenges.get(id) ?? null;
  }

  async findChallengeByTokenHash(
    kind: string,
    tokenHash: string,
  ): Promise<CredentialChallengeRecord | null> {
    return (
      [...this.challenges.values()].find(
        (c) => c.kind === kind && c.tokenHash === tokenHash,
      ) ?? null
    );
  }
}
