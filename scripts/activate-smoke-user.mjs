import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.resolve("packages/runtime-host/data/afh.dev.sqlite");
const db = new DatabaseSync(dbPath);

const rows = db
  .prepare(
    "SELECT id, record_type, lookup_key, payload_json FROM identity_records WHERE lookup_key LIKE ? OR payload_json LIKE ?",
  )
  .all("%rc84.smoke%", "%rc84.smoke%");

console.log("matches", rows.length);
for (const row of rows) {
  const payload = JSON.parse(row.payload_json);
  console.log({
    id: row.id,
    type: row.record_type,
    key: row.lookup_key,
    status: payload.status,
    email: payload.email,
  });
  if (payload.status && payload.status !== "active") {
    payload.status = "active";
    payload.emailVerifiedAt = new Date().toISOString();
    db.prepare(
      "UPDATE identity_records SET payload_json = ?, updated_at = ? WHERE id = ?",
    ).run(JSON.stringify(payload), new Date().toISOString(), row.id);
    console.log("activated", row.id);
  }
}
