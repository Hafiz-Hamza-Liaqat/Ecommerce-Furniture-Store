/**
 * RC6.7 — SQL restart acceptance: continue Workflow/Approval after reopen.
 * Reuses RC6.4 store injection; no new persistence framework.
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
} from "@afh/platform";
import { createSqlPersistenceFoundation } from "../composition/composition-root.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T00:00:00.000Z") };

describe("RC6.7 SQL restart / continue acceptance", () => {
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
    const dir = mkdtempSync(join(tmpdir(), `afh-rc67-${label}-`));
    dirs.push(dir);
    const dbPath = join(dir, "test.sqlite");
    const sql = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    return { sql, dbPath };
  }

  async function enginesFor(sql: ReturnType<typeof createSqlPersistenceFoundation>) {
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
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      rules: engines.rules,
    });
    assert.ok(seeded.ok, "seed must succeed");
    return engines;
  }

  it("reopens durable workflow instance and continues a transition", async () => {
    const { sql, dbPath } = openSql("wf-continue");
    const engines = await enginesFor(sql);

    const started = await engines.workflow.start({
      companyId: "company-rc67",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-restart-1",
      actorUserId: "user-1",
    });
    assert.ok(started.ok);
    const instanceId = started.value.id;
    assert.equal(started.value.statusProjection, "new");
    sql.dispose();

    const restored = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    const engines2 = await enginesFor(restored);

    const before = await engines2.workflow.getInstance(instanceId);
    assert.ok(before.ok && before.value);
    assert.equal(before.value.statusProjection, "new");
    assert.equal(before.value.instanceStatus, "running");

    const transitioned = await engines2.workflow.transition({
      instanceId,
      transitionCode: "qualify",
      actorUserId: "user-2",
    });
    assert.ok(
      transitioned.ok,
      transitioned.ok ? "" : transitioned.error.code,
    );
    assert.equal(transitioned.value.statusProjection, "qualified");

    const history = await restored.workflowStore.listHistory(instanceId);
    assert.ok(history.length >= 2);

    restored.dispose();
  });

  it("reopens durable approval request and continues decide", async () => {
    const { sql, dbPath } = openSql("appr-continue");
    const engines = await enginesFor(sql);

    const submitted = await engines.approval.submit({
      companyId: "company-rc67",
      type: "crm.lead_qualify",
      subjectType: "crm.lead",
      subjectId: "lead-appr-1",
      submittedByUserId: "user-1",
      payload: { preferredReviewerUserId: "user-reviewer" },
    });
    assert.ok(submitted.ok);
    const requestId = submitted.value.id;
    assert.equal(submitted.value.reviewerUserId, "user-reviewer");
    sql.dispose();

    const restored = createSqlPersistenceFoundation({
      config: { databasePath: dbPath },
      clock: fixedClock,
    });
    const engines2 = await enginesFor(restored);

    const existing = await engines2.approval.getRequest(requestId);
    assert.ok(existing.ok && existing.value);
    assert.equal(existing.value.status, "under_review");

    const decided = await engines2.approval.decide({
      requestId,
      reviewerUserId: "user-reviewer",
      decision: "approved",
      reason: "restart-continue",
    });
    assert.ok(decided.ok, decided.ok ? "" : decided.error.code);
    assert.equal(decided.value.status, "approved");

    const actions = await restored.approvalStore.listActions(requestId);
    assert.ok(actions.some((a) => a.action === "approve"));

    restored.dispose();
  });
});
