/**
 * RC6.4 — SQL Workflow/Approval store persistence, restart durability,
 * and seed idempotency against durable stores.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import {
  InMemorySecurityAuditStore,
  createIdentityFoundation,
} from "@afh/identity";
import {
  createPlatformEngines,
  seedPlatformDefinitions,
  WORKFLOW_CATALOG_CODES,
} from "@afh/platform";
import { createSqlPersistenceFoundation } from "../composition/composition-root.js";
import { MIGRATION_VERSION } from "../migrations/migrations.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T00:00:00.000Z") };

describe("RC6.4 SQL Workflow / Approval stores", () => {
  const dirs: string[] = [];

  after(() => {
    for (const dir of dirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  function openSql(label: string) {
    const dir = mkdtempSync(join(tmpdir(), `afh-rc64-${label}-`));
    dirs.push(dir);
    const dbPath = join(dir, "test.sqlite");
    const sql = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    return { sql, dbPath };
  }

  it("applies migration v2 and exposes workflow/approval stores", () => {
    const { sql } = openSql("migrate");
    assert.equal(sql.migrationCompatible, true);
    assert.ok(sql.workflowStore);
    assert.ok(sql.approvalStore);
    const max = sql.sqlClient.get<{ version: number }>(
      "SELECT MAX(version) AS version FROM schema_migrations",
    );
    assert.equal(max?.version, MIGRATION_VERSION);
    sql.dispose();
  });

  it("persists workflow definitions/instances/history/assignments across reopen", async () => {
    const { sql, dbPath } = openSql("workflow");
    const identity = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines = createPlatformEngines({
      identity,
      clock: fixedClock,
      workflowStore: sql.workflowStore,
      approvalStore: sql.approvalStore,
    });

    const seed = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(seed.ok);
    if (!seed.ok) return;
    assert.ok(seed.value.workflows.created > 0);

    const code = WORKFLOW_CATALOG_CODES[0]!;
    const started = await engines.workflow.start({
      companyId: "company-1",
      definitionCode: code,
      subjectType: "test_subject",
      subjectId: "subj-1",
      actorUserId: "user-1",
    });
    assert.equal(started.ok, true);
    if (!started.ok) return;
    const instanceId = started.value.id;

    await engines.workflow.assign({
      instanceId,
      stageId: started.value.currentStageId,
      userId: "user-2",
      teamId: null,
    });

    sql.dispose();

    const restored = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    const identity2 = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines2 = createPlatformEngines({
      identity: identity2,
      clock: fixedClock,
      workflowStore: restored.workflowStore,
      approvalStore: restored.approvalStore,
    });

    const defs = await engines2.workflow.listDefinitions({
      companyId: null,
      activeOnly: true,
    });
    assert.equal(defs.ok, true);
    if (!defs.ok) return;
    assert.ok(defs.value.length >= WORKFLOW_CATALOG_CODES.length);

    const found = await engines2.workflow.getInstance(instanceId);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.ok(found.value);
    assert.equal(found.value.subjectId, "subj-1");
    assert.equal(found.value.instanceStatus, "running");

    const history = await restored.workflowStore.listHistory(instanceId);
    assert.ok(history.length >= 1);

    const tasks = await restored.workflowStore.listAssignments(instanceId);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0]?.userId, "user-2");

    restored.dispose();
  });

  it("persists approval definitions/requests/actions across reopen", async () => {
    const { sql, dbPath } = openSql("approval");
    const identity = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines = createPlatformEngines({
      identity,
      clock: fixedClock,
      workflowStore: sql.workflowStore,
      approvalStore: sql.approvalStore,
    });

    await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });

    const submitted = await engines.approval.submit({
      companyId: "company-1",
      type: "sales.order_cancel",
      subjectType: "sales_order",
      subjectId: "SO-1",
      submittedByUserId: "user-1",
      payload: { reason: "test" },
    });
    assert.equal(submitted.ok, true);
    if (!submitted.ok) return;
    const requestId = submitted.value.id;

    const claimed = await engines.approval.claim(requestId, "user-2");
    assert.equal(claimed.ok, true);

    sql.dispose();

    const restored = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    const identity2 = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines2 = createPlatformEngines({
      identity: identity2,
      clock: fixedClock,
      workflowStore: restored.workflowStore,
      approvalStore: restored.approvalStore,
    });

    const listed = await engines2.approval.listRequests({
      companyId: "company-1",
    });
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);
    assert.equal(listed.value[0]?.id, requestId);
    assert.equal(listed.value[0]?.status, "under_review");

    const actions = await restored.approvalStore.listActions(requestId);
    assert.ok(actions.length >= 2);

    restored.dispose();
  });

  it("keeps RC6.1 seed idempotent against SQL stores", async () => {
    const { sql } = openSql("seed");
    const identity = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines = createPlatformEngines({
      identity,
      clock: fixedClock,
      workflowStore: sql.workflowStore,
      approvalStore: sql.approvalStore,
    });

    const first = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.value.workflows.created, 0);
    assert.equal(second.value.approvals.created, 0);
    assert.ok(second.value.workflows.existing > 0);
    assert.ok(second.value.approvals.existing > 0);

    const defs = await sql.workflowStore.listDefinitions({
      companyId: null,
      activeOnly: false,
    });
    assert.equal(defs.length, WORKFLOW_CATALOG_CODES.length);

    sql.dispose();
  });

  it("defaults to in-memory stores when SQL stores are not injected", async () => {
    const identity = createIdentityFoundation({
      clock: fixedClock,
      auditStore: new InMemorySecurityAuditStore(),
    });
    const engines = createPlatformEngines({ identity, clock: fixedClock });
    const seed = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.equal(seed.ok, true);
    const started = await engines.workflow.start({
      companyId: "company-1",
      definitionCode: WORKFLOW_CATALOG_CODES[0]!,
      subjectType: "test",
      subjectId: "x",
      actorUserId: null,
    });
    assert.equal(started.ok, true);
  });
});
