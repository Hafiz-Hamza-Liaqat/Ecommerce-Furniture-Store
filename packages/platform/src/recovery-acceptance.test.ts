/**
 * RC6.7 — Retry / idempotency / concurrency acceptance against existing
 * WorkflowEngine and ApprovalEngine guards (no new idempotency framework).
 *
 * Logical idempotency is proven via monotonic stage / already-decided guards:
 * safe retries fail closed instead of double-applying lifecycle effects.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIdentityFoundation } from "@afh/identity";
import { createPlatformEngines } from "./composition/composition-root.js";
import { seedPlatformDefinitions } from "./catalog/seed.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T12:00:00.000Z") };

async function seededEngines() {
  const identity = createIdentityFoundation({ clock: fixedClock });
  const engines = createPlatformEngines({ identity, clock: fixedClock });
  const seeded = await seedPlatformDefinitions({
    workflow: engines.workflow,
    approval: engines.approval,
    rules: engines.rules,
  });
  assert.ok(seeded.ok);
  return engines;
}

describe("RC6.7 retry acceptance (engine guards)", () => {
  it("rejects a duplicate transition after the stage has advanced", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc67",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-retry-1",
    });
    assert.ok(started.ok);

    const first = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.ok(first.ok);
    assert.equal(first.value.statusProjection, "qualified");

    const retry = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.equal(retry.ok, false);
    if (!retry.ok) {
      assert.equal(retry.error.code, "workflow_illegal_transition");
    }

    const loaded = await engines.workflow.getInstance(started.value.id);
    assert.ok(loaded.ok && loaded.value);
    assert.equal(loaded.value.statusProjection, "qualified");
  });

  it("rejects transition after the instance is completed", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc67",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-retry-2",
    });
    assert.ok(started.ok);

    const converted = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "convert",
    });
    assert.ok(converted.ok);
    assert.equal(converted.value.instanceStatus, "completed");

    const retry = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.equal(retry.ok, false);
    if (!retry.ok) {
      assert.equal(retry.error.code, "workflow_not_running");
    }
  });

  it("rejects a duplicate approval decide", async () => {
    const engines = await seededEngines();
    const submitted = await engines.approval.submit({
      companyId: "co-rc67",
      type: "crm.lead_qualify",
      subjectType: "crm.lead",
      subjectId: "lead-decide-1",
      submittedByUserId: "user-1",
      payload: { preferredReviewerUserId: "user-reviewer" },
    });
    assert.ok(submitted.ok);

    const first = await engines.approval.decide({
      requestId: submitted.value.id,
      reviewerUserId: "user-reviewer",
      decision: "approved",
    });
    assert.ok(first.ok);
    assert.equal(first.value.status, "approved");

    const retry = await engines.approval.decide({
      requestId: submitted.value.id,
      reviewerUserId: "user-reviewer",
      decision: "rejected",
    });
    assert.equal(retry.ok, false);
    if (!retry.ok) {
      assert.equal(retry.error.code, "approval_already_decided");
    }

    const loaded = await engines.approval.getRequest(submitted.value.id);
    assert.ok(loaded.ok && loaded.value);
    assert.equal(loaded.value.status, "approved");
  });
});

describe("RC6.7 idempotency acceptance (logical via guards)", () => {
  it("treats safe retry as fail-closed rather than a second lifecycle effect", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc67",
      definitionCode: "project_task_v1",
      subjectType: "projects.task",
      subjectId: "task-idem-1",
    });
    assert.ok(started.ok);

    const complete = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "complete",
    });
    assert.ok(complete.ok);

    const historyBefore = await engines.workflow.listHistory(started.value.id);
    assert.ok(historyBefore.ok);
    const countBefore = historyBefore.value.length;

    const replay = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "complete",
    });
    assert.equal(replay.ok, false);
    if (!replay.ok) {
      assert.equal(replay.error.code, "workflow_not_running");
    }

    const historyAfter = await engines.workflow.listHistory(started.value.id);
    assert.ok(historyAfter.ok);
    assert.equal(historyAfter.value.length, countBefore);

    const instance = await engines.workflow.getInstance(started.value.id);
    assert.ok(instance.ok && instance.value);
    assert.equal(instance.value.statusProjection, "completed");
    assert.equal(instance.value.instanceStatus, "completed");
  });
});

describe("RC6.7 concurrency acceptance (fail-closed + consistent final state)", () => {
  it("fails the second of two sequential conflicting transitions", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc67",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-conc-1",
    });
    assert.ok(started.ok);

    const first = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.ok(first.ok);
    assert.equal(first.value.statusProjection, "qualified");

    const second = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.error.code, "workflow_illegal_transition");
    }

    const final = await engines.workflow.getInstance(started.value.id);
    assert.ok(final.ok && final.value);
    assert.equal(final.value.statusProjection, "qualified");
    assert.equal(final.value.instanceStatus, "running");
  });

  it("keeps a legal final stage when two transitions race (no distributed lock)", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc67",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-conc-race",
    });
    assert.ok(started.ok);
    const instanceId = started.value.id;

    const results = await Promise.all([
      engines.workflow.transition({
        instanceId,
        transitionCode: "qualify",
      }),
      engines.workflow.transition({
        instanceId,
        transitionCode: "convert",
      }),
    ]);

    const successes = results.filter((r) => r.ok);
    assert.ok(successes.length >= 1);

    const final = await engines.workflow.getInstance(instanceId);
    assert.ok(final.ok && final.value);
    assert.ok(
      final.value.statusProjection === "qualified" ||
        final.value.statusProjection === "converted",
    );
    if (final.value.statusProjection === "converted") {
      assert.equal(final.value.instanceStatus, "completed");
    } else {
      assert.equal(final.value.instanceStatus, "running");
    }
  });
});
