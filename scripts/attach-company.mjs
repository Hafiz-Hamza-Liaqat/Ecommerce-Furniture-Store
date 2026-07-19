import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const db = new DatabaseSync(path.resolve("packages/runtime-host/data/afh.dev.sqlite"));
const row = db
  .prepare("SELECT id, payload_json FROM identity_records WHERE lookup_key = ?")
  .get("rc84.smoke@example.com");
const p = JSON.parse(row.payload_json);
p.companyId = "company-demo";
p.status = "active";
db.prepare(
  "UPDATE identity_records SET payload_json = ?, company_id = ?, updated_at = ? WHERE id = ?",
).run(JSON.stringify(p), "company-demo", new Date().toISOString(), row.id);
console.log("updated", { email: p.email, companyId: p.companyId, status: p.status });

const types = db.prepare("SELECT DISTINCT record_type FROM identity_records").all();
console.log(
  "types",
  types.map((t) => t.record_type),
);

const admin = db
  .prepare("SELECT id, lookup_key, company_id FROM identity_records WHERE lookup_key = ?")
  .get("admin@afh.local");
console.log("admin", admin);

const roleish = db
  .prepare(
    "SELECT id, record_type, lookup_key FROM identity_records WHERE record_type IN ('role_assignment','user_role','rbac_assignment','principal_role') LIMIT 20",
  )
  .all();
console.log("roleish", roleish);
