import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { randomBytes } from "node:crypto";

const db = new DatabaseSync(path.resolve("packages/runtime-host/data/afh.dev.sqlite"));

const smoke = db
  .prepare("SELECT id, payload_json FROM identity_records WHERE lookup_key = ?")
  .get("rc84.smoke@example.com");
const smokeUser = JSON.parse(smoke.payload_json);
console.log("smoke user id", smokeUser.id);

const adminRole = db
  .prepare("SELECT id, payload_json FROM identity_records WHERE id = ?")
  .get("user_role:urole_dev_user_mrmrnxrj_0uxta3f5");
const rolePayload = JSON.parse(adminRole.payload_json);
console.log("admin role assignment sample", rolePayload);

const newId = `urole_smoke_${randomBytes(4).toString("hex")}`;
const assignment = {
  ...rolePayload,
  id: newId,
  userId: smokeUser.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
db.prepare(
  "INSERT OR REPLACE INTO identity_records (id, record_type, lookup_key, company_id, payload_json, updated_at) VALUES (?, 'user_role', ?, ?, ?, ?)",
).run(
  `user_role:${newId}`,
  smokeUser.id,
  "company-demo",
  JSON.stringify(assignment),
  new Date().toISOString(),
);
console.log("granted role", assignment.roleId ?? assignment.roleCode ?? assignment);
