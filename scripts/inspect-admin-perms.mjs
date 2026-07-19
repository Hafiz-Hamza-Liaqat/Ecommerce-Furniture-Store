import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const db = new DatabaseSync(path.resolve("packages/runtime-host/data/afh.dev.sqlite"));

const roleId = "role_mrp8bc1o_jt1nt9fz";
const role = db
  .prepare("SELECT id, payload_json FROM identity_records WHERE id = ?")
  .get(`role:${roleId}`);
console.log("role row", role ? JSON.parse(role.payload_json) : null);

const rps = db
  .prepare(
    "SELECT payload_json FROM identity_records WHERE record_type = 'role_permission'",
  )
  .all();
const forRole = [];
for (const row of rps) {
  const p = JSON.parse(row.payload_json);
  if (p.roleId === roleId) forRole.push(p.permissionId || p.permissionCode);
}
console.log("perm count for role", forRole.length);
console.log(
  "has hr.employees.read",
  forRole.some((c) => String(c).includes("hr.employees.read") || String(c).includes("employees")),
);
console.log(
  "has jobs",
  forRole.filter((c) => String(c).includes("job")),
);
console.log(
  "hr related",
  forRole.filter((c) => String(c).toLowerCase().includes("hr")),
);

const perms = db
  .prepare("SELECT id, lookup_key, payload_json FROM identity_records WHERE record_type = 'permission'")
  .all();
const hrPerms = perms.filter((r) => r.lookup_key?.includes("hr") || r.id.includes("hr"));
const jobPerms = perms.filter((r) => r.lookup_key?.includes("job") || r.id.includes("job"));
console.log(
  "permission catalog hr",
  hrPerms.map((r) => r.lookup_key),
);
console.log(
  "permission catalog jobs",
  jobPerms.map((r) => r.lookup_key),
);

const allRoles = db
  .prepare("SELECT id, lookup_key, payload_json FROM identity_records WHERE record_type = 'role'")
  .all();
for (const r of allRoles) {
  const p = JSON.parse(r.payload_json);
  console.log({ id: r.id, code: p.code, lookup: r.lookup_key });
}
