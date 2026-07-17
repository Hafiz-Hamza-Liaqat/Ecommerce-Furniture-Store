/**
 * RC6.1 platform definition seed tests — catalog shape, idempotency,
 * start resolution for all workflow codes, and approval registration.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InMemorySecurityAuditStore,
  SecurityAuditService,
  createIdentityFoundation,
} from "@afh/identity";
import { createPlatformEngines } from "../composition/composition-root.js";
import {
  APPROVAL_CATALOG,
  APPROVAL_CATALOG_TYPES,
  PLATFORM_DEFINITIONS_CATALOG_VERSION,
  WORKFLOW_CATALOG,
  WORKFLOW_CATALOG_CODES,
  computePlatformDefinitionsChecksum,
  seedPlatformDefinitions,
} from "./index.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T00:00:00.000Z") };

function createSeededEngines() {
  const identity = createIdentityFoundation({ clock: fixedClock });
  return createPlatformEngines({ identity, clock: fixedClock });
}

describe("platform definition catalog", () => {
  it("exposes 19 workflow codes and 16 approval types", () => {
    assert.equal(WORKFLOW_CATALOG.length, 19);
    assert.equal(WORKFLOW_CATALOG_CODES.length, 19);
    assert.equal(new Set(WORKFLOW_CATALOG_CODES).size, 19);
    assert.equal(APPROVAL_CATALOG.length, 16);
    assert.equal(APPROVAL_CATALOG_TYPES.length, 16);
    assert.equal(new Set(APPROVAL_CATALOG_TYPES).size, 16);
  });

  it("requires exactly one initial stage per workflow definition", () => {
    for (const definition of WORKFLOW_CATALOG) {
      const initials = definition.stages.filter((s) => s.isInitial);
      assert.equal(
        initials.length,
        1,
        `${definition.code} must have exactly one initial stage`,
      );
      assert.equal(definition.companyId, null);
      assert.equal(definition.version, 1);
    }
  });
});

describe("seedPlatformDefinitions", () => {
  it("seeds all definitions on empty engines", async () => {
    const engines = createSeededEngines();
    const result = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });

    assert.ok(result.ok, "seed must succeed");
    const report = result.value;
    assert.equal(report.catalogVersion, PLATFORM_DEFINITIONS_CATALOG_VERSION);
    assert.equal(report.checksum, computePlatformDefinitionsChecksum());
    assert.equal(report.workflows.created, 19);
    assert.equal(report.workflows.existing, 0);
    assert.equal(report.approvals.created, 16);
    assert.equal(report.approvals.existing, 0);
  });

  it("is idempotent: rerunning creates nothing", async () => {
    const engines = createSeededEngines();
    const first = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(first.ok);

    const second = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(second.ok);
    assert.equal(second.value.workflows.created, 0);
    assert.equal(second.value.workflows.existing, 19);
    assert.equal(second.value.approvals.created, 0);
    assert.equal(second.value.approvals.existing, 16);
  });

  it("makes every catalog workflow code startable", async () => {
    const engines = createSeededEngines();
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(seeded.ok);

    for (const definition of WORKFLOW_CATALOG) {
      const started = await engines.workflow.start({
        companyId: "company-rc61",
        definitionCode: definition.code,
        subjectType: definition.entityType,
        subjectId: `subject-${definition.code}`,
        actorUserId: "user-rc61",
      });
      assert.ok(
        started.ok,
        `${definition.code} must start: ${started.ok ? "" : started.error.code}`,
      );
      const initial = definition.stages.find((s) => s.isInitial);
      assert.equal(started.value.statusProjection, initial?.code);
      assert.equal(started.value.instanceStatus, "running");
    }
  });

  it("registers known handler default transitions from the initial stage", async () => {
    const engines = createSeededEngines();
    const seeded = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(seeded.ok);

    const cases: readonly {
      readonly code: string;
      readonly transition: string;
      readonly expectedStatus: string;
    }[] = [
      { code: "crm_lead_v1", transition: "qualify", expectedStatus: "qualified" },
      {
        code: "purchase_requisition_v1",
        transition: "submit",
        expectedStatus: "submitted",
      },
      {
        code: "purchase_order_v1",
        transition: "issue",
        expectedStatus: "issued",
      },
      {
        code: "sales_order_fulfillment_v1",
        transition: "cancel",
        expectedStatus: "cancelled",
      },
      {
        code: "project_v1",
        transition: "archive",
        expectedStatus: "archived",
      },
      {
        code: "project_task_v1",
        transition: "complete",
        expectedStatus: "completed",
      },
      {
        code: "service_request_v1",
        transition: "close",
        expectedStatus: "closed",
      },
      {
        code: "service_work_order_v1",
        transition: "complete",
        expectedStatus: "completed",
      },
    ];

    for (const testCase of cases) {
      const started = await engines.workflow.start({
        companyId: "company-rc61",
        definitionCode: testCase.code,
        subjectType: `test.${testCase.code}`,
        subjectId: `tx-${testCase.code}`,
      });
      assert.ok(started.ok, `${testCase.code} start`);
      const transitioned = await engines.workflow.transition({
        instanceId: started.value.id,
        transitionCode: testCase.transition,
      });
      assert.ok(
        transitioned.ok,
        `${testCase.code}.${testCase.transition}: ${
          transitioned.ok ? "" : transitioned.error.code
        }`,
      );
      assert.equal(
        transitioned.value.statusProjection,
        testCase.expectedStatus,
      );
    }
  });

  it("records a seed audit event when audit is provided", async () => {
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);
    const engines = createSeededEngines();

    const result = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
      audit,
    });
    assert.ok(result.ok);

    const records = audit.recentRecords();
    const seeded = records.find((r) => r.action === "platform.definitions_seeded");
    assert.ok(seeded);
    assert.equal(seeded.outcome, "success");
    assert.equal(seeded.entityId, PLATFORM_DEFINITIONS_CATALOG_VERSION);
  });
});
