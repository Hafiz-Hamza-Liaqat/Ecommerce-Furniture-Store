/**
 * RC6.5 engine completion — guards, assignment, SLA, escalation,
 * notification event production, and status projections.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIdentityFoundation } from "@afh/identity";
import { InMemoryOutboxStore } from "@afh/persistence";
import { createPlatformEngines } from "./composition/composition-root.js";
import { seedPlatformDefinitions } from "./catalog/seed.js";
import {
  computeStageSlaDeadline,
  isStageSlaBreached,
} from "./workflow/sla.js";

const base = new Date("2026-07-18T00:00:00.000Z");

function clockAt(iso: string) {
  return { now: (): Date => new Date(iso) };
}

describe("RC6.5 SLA helpers", () => {
  it("computes deadlines and breach detection", () => {
    const deadline = computeStageSlaDeadline(base.toISOString(), 72);
    assert.ok(deadline);
    assert.equal(deadline.toISOString(), "2026-07-21T00:00:00.000Z");
    assert.equal(isStageSlaBreached(base.toISOString(), 72, base), false);
    assert.equal(
      isStageSlaBreached(
        base.toISOString(),
        72,
        new Date("2026-07-21T00:00:00.001Z"),
      ),
      true,
    );
    assert.equal(computeStageSlaDeadline(base.toISOString(), null), null);
  });
});

describe("RC6.5 workflow guards + projections", () => {
  it("allows default transitions and rejects denyTransition context", async () => {
    const identity = createIdentityFoundation({ clock: clockAt(base.toISOString()) });
    const engines = createPlatformEngines({
      identity,
      clock: clockAt(base.toISOString()),
    });
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      rules: engines.rules,
    });
    assert.ok(seeded.ok);

    const started = await engines.workflow.start({
      companyId: "co-1",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-guard-1",
    });
    assert.ok(started.ok);

    const projection = await engines.statusProjections.get(
      "crm.lead",
      "lead-guard-1",
    );
    assert.ok(projection);
    assert.equal(projection.statusProjection, "new");

    const allowed = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
    });
    assert.ok(allowed.ok);
    assert.equal(allowed.value.statusProjection, "qualified");

    const after = await engines.statusProjections.get("crm.lead", "lead-guard-1");
    assert.equal(after?.statusProjection, "qualified");

    const started2 = await engines.workflow.start({
      companyId: "co-1",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-guard-2",
    });
    assert.ok(started2.ok);
    const denied = await engines.workflow.transition({
      instanceId: started2.value.id,
      transitionCode: "qualify",
      guardContext: { denyTransition: true },
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.error.code, "workflow_guard_rejected");
    }
  });

  it("reports SLA breaches and emits outbox notification events", async () => {
    let now = base;
    const clock = { now: (): Date => now };
    const identity = createIdentityFoundation({ clock });
    const outbox = new InMemoryOutboxStore();
    const engines = createPlatformEngines({
      identity,
      clock,
      outboxStore: outbox,
      enableOutboxEngineEvents: true,
    });
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      rules: engines.rules,
    });
    assert.ok(seeded.ok);

    const started = await engines.workflow.start({
      companyId: "co-sla",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-sla-1",
    });
    assert.ok(started.ok);

    now = new Date("2026-07-21T00:00:00.001Z");
    const reported = await engines.workflow.reportSlaBreaches("co-sla");
    assert.ok(reported.ok);
    assert.equal(reported.value.length, 1);

    const pending = await outbox.listPending(50);
    assert.ok(pending.ok);
    const topics = pending.value.map((m) => m.topic);
    assert.ok(topics.includes("workflow.started"));
    assert.ok(topics.includes("workflow.status_projected"));
    assert.ok(topics.includes("workflow.sla_breached"));
  });
});

describe("RC6.5 approval assignment + escalation", () => {
  it("resolves preferred reviewer from payload via Rules", async () => {
    const identity = createIdentityFoundation({ clock: clockAt(base.toISOString()) });
    const engines = createPlatformEngines({
      identity,
      clock: clockAt(base.toISOString()),
    });
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      rules: engines.rules,
    });
    assert.ok(seeded.ok);

    const submitted = await engines.approval.submit({
      companyId: "co-1",
      type: "crm.lead_qualify",
      subjectType: "crm.lead",
      subjectId: "lead-1",
      submittedByUserId: "user-submitter",
      payload: { preferredReviewerUserId: "user-reviewer" },
    });
    assert.ok(submitted.ok);
    assert.equal(submitted.value.reviewerUserId, "user-reviewer");
    assert.equal(submitted.value.status, "under_review");
    assert.equal(submitted.value.escalateAfterHours, 48);
  });

  it("leaves queue unassigned without preferred reviewer and escalates after SLA", async () => {
    let now = base;
    const clock = { now: (): Date => now };
    const identity = createIdentityFoundation({ clock });
    const outbox = new InMemoryOutboxStore();
    const engines = createPlatformEngines({
      identity,
      clock,
      outboxStore: outbox,
      enableOutboxEngineEvents: true,
    });
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      rules: engines.rules,
    });
    assert.ok(seeded.ok);

    const submitted = await engines.approval.submit({
      companyId: "co-esc",
      type: "crm.lead_qualify",
      subjectType: "crm.lead",
      subjectId: "lead-esc",
      submittedByUserId: "user-submitter",
      payload: { escalationReviewerUserId: "user-escalated" },
    });
    assert.ok(submitted.ok);
    assert.equal(submitted.value.reviewerUserId, null);
    assert.equal(submitted.value.status, "submitted");
    assert.equal(submitted.value.escalateAfterHours, 48);

    now = new Date("2026-07-20T00:00:00.001Z");
    const escalated = await engines.approval.escalateDueRequests("co-esc");
    assert.ok(escalated.ok);
    assert.equal(escalated.value.length, 1);
    assert.equal(escalated.value[0]?.reviewerUserId, "user-escalated");

    const pending = await outbox.listPending(50);
    assert.ok(pending.ok);
    assert.ok(pending.value.some((m) => m.topic === "approval.submitted"));
    assert.ok(pending.value.some((m) => m.topic === "approval.escalated"));
  });
});
