/**
 * RC6.6 — Workflow Status Projection Proof acceptance tests.
 *
 * Demonstrates Law A.1 / ADR D04 / D54:
 * - Workflow instance statusProjection is lifecycle SSoT
 * - Projection store mirrors transitions consistently
 * - Entity status must equal statusProjection (read-only projection)
 * - Divergent entity status is detected as an independent lifecycle owner
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIdentityFoundation } from "@afh/identity";
import { createPlatformEngines } from "./composition/composition-root.js";
import { seedPlatformDefinitions } from "./catalog/seed.js";
import {
  entityStatusFromWorkflowProjection,
  entityStatusMatchesProjection,
  evaluateStatusProjectionConsistency,
} from "./workflow/status-projection.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T12:00:00.000Z") };

async function seededEngines() {
  const identity = createIdentityFoundation({ clock: fixedClock });
  const engines = createPlatformEngines({ identity, clock: fixedClock });
  const seeded = await seedPlatformDefinitions({
    workflow: engines.workflow,
    approval: engines.approval,
    rules: engines.rules,
  });
  assert.ok(seeded.ok, "platform definitions must seed");
  return engines;
}

describe("RC6.6 status projection helpers", () => {
  it("treats entity status as exactly the workflow projection", () => {
    assert.equal(entityStatusFromWorkflowProjection("qualified"), "qualified");
    assert.equal(entityStatusMatchesProjection("qualified", "qualified"), true);
    assert.equal(entityStatusMatchesProjection("new", "qualified"), false);
  });

  it("flags entity status that diverges from workflow as independent ownership", () => {
    const result = evaluateStatusProjectionConsistency({
      instance: { id: "winst_1", statusProjection: "qualified" },
      storeRecord: {
        subjectType: "crm.lead",
        subjectId: "lead-1",
        statusProjection: "qualified",
        instanceId: "winst_1",
        updatedAt: fixedClock.now().toISOString(),
      },
      entityStatus: "converted",
    });
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes("entity_status_independent_of_workflow"));
  });
});

describe("RC6.6 workflow transitions update projected status", () => {
  it("keeps instance, projection store, and entity status aligned across transitions", async () => {
    const engines = await seededEngines();

    const started = await engines.workflow.start({
      companyId: "co-rc66",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-rc66-1",
      actorUserId: "user-rc66",
    });
    assert.ok(started.ok);
    const instanceId = started.value.id;

    let store = await engines.statusProjections.get("crm.lead", "lead-rc66-1");
    let entityStatus = entityStatusFromWorkflowProjection(
      started.value.statusProjection,
    );
    let consistency = evaluateStatusProjectionConsistency({
      instance: started.value,
      storeRecord: store,
      entityStatus,
    });
    assert.equal(consistency.ok, true);
    assert.equal(started.value.statusProjection, "new");
    assert.equal(store?.statusProjection, "new");
    assert.equal(entityStatus, "new");

    const qualified = await engines.workflow.transition({
      instanceId,
      transitionCode: "qualify",
      actorUserId: "user-rc66",
    });
    assert.ok(qualified.ok);
    store = await engines.statusProjections.get("crm.lead", "lead-rc66-1");
    entityStatus = entityStatusFromWorkflowProjection(
      qualified.value.statusProjection,
    );
    consistency = evaluateStatusProjectionConsistency({
      instance: qualified.value,
      storeRecord: store,
      entityStatus,
    });
    assert.equal(consistency.ok, true);
    assert.equal(qualified.value.statusProjection, "qualified");
    assert.equal(store?.statusProjection, "qualified");
    assert.equal(entityStatus, "qualified");

    const converted = await engines.workflow.transition({
      instanceId,
      transitionCode: "convert",
      actorUserId: "user-rc66",
    });
    assert.ok(converted.ok);
    store = await engines.statusProjections.get("crm.lead", "lead-rc66-1");
    entityStatus = entityStatusFromWorkflowProjection(
      converted.value.statusProjection,
    );
    consistency = evaluateStatusProjectionConsistency({
      instance: converted.value,
      storeRecord: store,
      entityStatus,
    });
    assert.equal(consistency.ok, true);
    assert.equal(converted.value.statusProjection, "converted");
    assert.equal(store?.statusProjection, "converted");
    assert.equal(entityStatus, "converted");
    assert.equal(converted.value.instanceStatus, "completed");
  });

  it("does not advance projection when a transition is rejected", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc66",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-rc66-deny",
    });
    assert.ok(started.ok);

    const denied = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "qualify",
      guardContext: { denyTransition: true },
    });
    assert.equal(denied.ok, false);

    const store = await engines.statusProjections.get(
      "crm.lead",
      "lead-rc66-deny",
    );
    const reloaded = await engines.workflow.getInstance(started.value.id);
    assert.ok(reloaded.ok && reloaded.value);
    assert.equal(reloaded.value.statusProjection, "new");
    assert.equal(store?.statusProjection, "new");

    const consistency = evaluateStatusProjectionConsistency({
      instance: reloaded.value,
      storeRecord: store,
      entityStatus: "new",
    });
    assert.equal(consistency.ok, true);
  });

  it("proves entity status cannot act as an independent lifecycle owner", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc66",
      definitionCode: "project_task_v1",
      subjectType: "projects.task",
      subjectId: "task-rc66-1",
    });
    assert.ok(started.ok);

    const store = await engines.statusProjections.get(
      "projects.task",
      "task-rc66-1",
    );
    // Simulate an illegal independent entity status patch (forbidden by Law A.1).
    const illegal = evaluateStatusProjectionConsistency({
      instance: started.value,
      storeRecord: store,
      entityStatus: "completed",
    });
    assert.equal(illegal.ok, false);
    assert.ok(illegal.reasons.includes("entity_status_independent_of_workflow"));

    // Workflow remains SSoT — instance and store still at initial stage.
    assert.equal(started.value.statusProjection, "draft");
    assert.equal(store?.statusProjection, "draft");

    const completed = await engines.workflow.transition({
      instanceId: started.value.id,
      transitionCode: "complete",
    });
    assert.ok(completed.ok);
    const after = await engines.statusProjections.get(
      "projects.task",
      "task-rc66-1",
    );
    const legal = evaluateStatusProjectionConsistency({
      instance: completed.value,
      storeRecord: after,
      entityStatus: entityStatusFromWorkflowProjection(
        completed.value.statusProjection,
      ),
    });
    assert.equal(legal.ok, true);
    assert.equal(completed.value.statusProjection, "completed");
  });

  it("keeps the projection store as a mirror — not a competing SSoT", async () => {
    const engines = await seededEngines();
    const started = await engines.workflow.start({
      companyId: "co-rc66",
      definitionCode: "crm_campaign_v1",
      subjectType: "crm.campaign",
      subjectId: "campaign-rc66-1",
    });
    assert.ok(started.ok);

    // Tamper with the mirror store without a workflow transition.
    await engines.statusProjections.upsert({
      subjectType: "crm.campaign",
      subjectId: "campaign-rc66-1",
      statusProjection: "completed",
      instanceId: started.value.id,
      updatedAt: fixedClock.now().toISOString(),
    });

    const instance = await engines.workflow.getInstance(started.value.id);
    assert.ok(instance.ok && instance.value);
    // Workflow instance is unchanged — still SSoT.
    assert.equal(instance.value.statusProjection, "draft");

    const store = await engines.statusProjections.get(
      "crm.campaign",
      "campaign-rc66-1",
    );
    const consistency = evaluateStatusProjectionConsistency({
      instance: instance.value,
      storeRecord: store,
      entityStatus: "draft",
    });
    assert.equal(consistency.ok, false);
    assert.ok(consistency.reasons.includes("store_diverges_from_workflow"));
  });
});
