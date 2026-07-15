/**
 * SQL IdentityStore — durable identity/RBAC/session records.
 * Lookup columns for email/code; payload holds full records.
 */

import type { IdentityStore } from "@afh/identity";
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
} from "@afh/identity";
import type { SqliteDatabaseClient } from "../database/sqlite-client.js";

type IdentityRow = {
  id: string;
  record_type: string;
  lookup_key: string | null;
  company_id: string | null;
  payload_json: string;
  updated_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

export class SqlIdentityStore implements IdentityStore {
  constructor(private readonly client: SqliteDatabaseClient) {}

  #get<T>(id: string): T | null {
    const row = this.client.get<IdentityRow>(
      "SELECT * FROM identity_records WHERE id = ?",
      [id],
    );
    return row ? (JSON.parse(row.payload_json) as T) : null;
  }

  #getByLookup<T>(recordType: string, lookupKey: string): T | null {
    const row = this.client.get<IdentityRow>(
      "SELECT * FROM identity_records WHERE record_type = ? AND lookup_key = ?",
      [recordType, lookupKey],
    );
    return row ? (JSON.parse(row.payload_json) as T) : null;
  }

  #listByType<T>(recordType: string, companyId?: string | null): T[] {
    const rows =
      companyId === undefined
        ? this.client.all<IdentityRow>(
            "SELECT * FROM identity_records WHERE record_type = ?",
            [recordType],
          )
        : this.client.all<IdentityRow>(
            "SELECT * FROM identity_records WHERE record_type = ? AND company_id IS ?",
            [recordType, companyId],
          );
    return rows.map((r) => JSON.parse(r.payload_json) as T);
  }

  #save(
    id: string,
    recordType: string,
    lookupKey: string | null,
    companyId: string | null,
    payload: unknown,
  ): void {
    const updatedAt = nowIso();
    const existing = this.client.get<IdentityRow>(
      "SELECT id FROM identity_records WHERE id = ?",
      [id],
    );
    if (existing) {
      this.client.run(
        `UPDATE identity_records
         SET lookup_key = ?, company_id = ?, payload_json = ?, updated_at = ?
         WHERE id = ?`,
        [lookupKey, companyId, JSON.stringify(payload), updatedAt, id],
      );
    } else {
      this.client.run(
        `INSERT INTO identity_records
          (id, record_type, lookup_key, company_id, payload_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          recordType,
          lookupKey,
          companyId,
          JSON.stringify(payload),
          updatedAt,
        ],
      );
    }
  }

  #delete(id: string): void {
    this.client.run("DELETE FROM identity_records WHERE id = ?", [id]);
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    return this.#get<UserRecord>(`user:${id}`);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    return this.#getByLookup<UserRecord>("user", email.toLowerCase());
  }

  async saveUser(user: UserRecord): Promise<void> {
    this.#save(
      `user:${user.id}`,
      "user",
      user.email.toLowerCase(),
      user.companyId,
      user,
    );
  }

  async getProfile(userId: string): Promise<PersonProfileRecord | null> {
    return this.#get<PersonProfileRecord>(`profile:${userId}`);
  }

  async saveProfile(profile: PersonProfileRecord): Promise<void> {
    this.#save(`profile:${profile.userId}`, "profile", profile.userId, null, profile);
  }

  async getEmployeeByUserId(userId: string): Promise<EmployeeRecord | null> {
    return this.#getByLookup<EmployeeRecord>("employee", userId);
  }

  async saveEmployee(employee: EmployeeRecord): Promise<void> {
    this.#save(
      `employee:${employee.id}`,
      "employee",
      employee.userId,
      employee.companyId,
      employee,
    );
  }

  async getPartnerByUserId(userId: string): Promise<PartnerProfileRecord | null> {
    return this.#getByLookup<PartnerProfileRecord>("partner", userId);
  }

  async savePartner(partner: PartnerProfileRecord): Promise<void> {
    this.#save(
      `partner:${partner.id}`,
      "partner",
      partner.userId,
      partner.companyId,
      partner,
    );
  }

  async getOrganization(id: string): Promise<OrganizationRecord | null> {
    return this.#get<OrganizationRecord>(`org:${id}`);
  }

  async saveOrganization(org: OrganizationRecord): Promise<void> {
    this.#save(`org:${org.id}`, "organization", org.id, org.companyId, org);
  }

  async listOrganizationMembers(
    organizationId: string,
  ): Promise<readonly OrganizationMemberRecord[]> {
    return this.#listByType<OrganizationMemberRecord>("org_member").filter(
      (m) => m.organizationId === organizationId,
    );
  }

  async getOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRecord | null> {
    return (
      (await this.listOrganizationMembers(organizationId)).find(
        (m) => m.userId === userId,
      ) ?? null
    );
  }

  async saveOrganizationMember(member: OrganizationMemberRecord): Promise<void> {
    this.#save(
      `org_member:${member.id}`,
      "org_member",
      `${member.organizationId}:${member.userId}`,
      null,
      member,
    );
  }

  async saveInvitation(invitation: OrganizationInvitationRecord): Promise<void> {
    this.#save(
      `invitation:${invitation.id}`,
      "invitation",
      invitation.id,
      null,
      invitation,
    );
  }

  async getInvitation(
    id: string,
  ): Promise<OrganizationInvitationRecord | null> {
    return this.#get<OrganizationInvitationRecord>(`invitation:${id}`);
  }

  async getServiceAccount(id: string): Promise<ServiceAccountRecord | null> {
    return this.#get<ServiceAccountRecord>(`sa:${id}`);
  }

  async getServiceAccountByUserId(
    userId: string,
  ): Promise<ServiceAccountRecord | null> {
    return this.#getByLookup<ServiceAccountRecord>("service_account", userId);
  }

  async saveServiceAccount(account: ServiceAccountRecord): Promise<void> {
    this.#save(
      `sa:${account.id}`,
      "service_account",
      account.userId,
      account.companyId,
      account,
    );
  }

  async getPermissionByCode(code: string): Promise<PermissionRecord | null> {
    return this.#getByLookup<PermissionRecord>("permission", code);
  }

  async getPermissionById(id: string): Promise<PermissionRecord | null> {
    return this.#get<PermissionRecord>(`permission:${id}`);
  }

  async savePermission(permission: PermissionRecord): Promise<void> {
    this.#save(
      `permission:${permission.id}`,
      "permission",
      permission.code,
      null,
      permission,
    );
  }

  async getRoleById(id: string): Promise<RoleRecord | null> {
    return this.#get<RoleRecord>(`role:${id}`);
  }

  async getRoleByCode(
    companyId: string | null,
    code: string,
  ): Promise<RoleRecord | null> {
    const rows = this.#listByType<RoleRecord>("role", companyId);
    return rows.find((r) => r.code === code) ?? null;
  }

  async saveRole(role: RoleRecord): Promise<void> {
    this.#save(`role:${role.id}`, "role", role.code, role.companyId, role);
  }

  async listRolePermissions(
    roleId: string,
  ): Promise<readonly RolePermissionRecord[]> {
    return this.#listByType<RolePermissionRecord>("role_permission").filter(
      (l) => l.roleId === roleId,
    );
  }

  async saveRolePermission(link: RolePermissionRecord): Promise<void> {
    this.#save(
      `role_permission:${link.roleId}:${link.permissionId}`,
      "role_permission",
      `${link.roleId}:${link.permissionId}`,
      null,
      link,
    );
  }

  async listUserRoles(userId: string): Promise<readonly UserRoleRecord[]> {
    return this.#listByType<UserRoleRecord>("user_role").filter(
      (a) => a.userId === userId,
    );
  }

  async saveUserRole(assignment: UserRoleRecord): Promise<void> {
    this.#save(
      `user_role:${assignment.id}`,
      "user_role",
      assignment.userId,
      assignment.companyId,
      assignment,
    );
  }

  async removeUserRole(assignmentId: string): Promise<void> {
    this.#delete(`user_role:${assignmentId}`);
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    return this.#get<SessionRecord>(`session:${id}`);
  }

  async listSessionsByUser(userId: string): Promise<readonly SessionRecord[]> {
    return this.#listByType<SessionRecord>("session").filter(
      (s) => s.userId === userId,
    );
  }

  async saveSession(session: SessionRecord): Promise<void> {
    this.#save(
      `session:${session.id}`,
      "session",
      session.userId,
      session.companyId,
      session,
    );
  }

  async saveChallenge(challenge: CredentialChallengeRecord): Promise<void> {
    this.#save(
      `challenge:${challenge.id}`,
      "challenge",
      challenge.tokenHash,
      null,
      challenge,
    );
  }

  async getChallenge(id: string): Promise<CredentialChallengeRecord | null> {
    return this.#get<CredentialChallengeRecord>(`challenge:${id}`);
  }

  async findChallengeByTokenHash(
    kind: string,
    tokenHash: string,
  ): Promise<CredentialChallengeRecord | null> {
    const rows = this.#listByType<CredentialChallengeRecord>("challenge");
    return (
      rows.find((c) => c.kind === kind && c.tokenHash === tokenHash) ?? null
    );
  }
}
