/**
 * RC6.2 operator CQRS — thin handlers delegate to Workflow/Approval engines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApplicationContext } from "@afh/application";
import {
  createIdentityFoundation,
  seedRbacCatalog,
} from "@afh/identity";
import {
  createPlatformEngines,
  seedPlatformDefinitions,
  type ApprovalRequestRecord,
  type WorkflowDefinitionRecord,
  type WorkflowInstanceRecord,
  type WorkflowTransitionRecord,
} from "@afh/platform";
import type { Command, Query, UnitOfWork } from "@afh/shared-kernel";
import {
  CommandId,
  CorrelationId,
  QueryId,
} from "@afh/shared-kernel";
import type { CausationId } from "@afh/shared-kernel";
import { createWorkflowApplication } from "../composition/composition-root.js";
import {
  ApprovalQueryTypes,
  WorkflowCommandTypes,
  WorkflowQueryTypes,
} from "../constants.js";
import type { TransitionWorkflowInstancePayload } from "../commands/commands.js";
import type {
  ListApprovalRequestsPayload,
  ListAvailableTransitionsPayload,
  ListWorkflowDefinitionsPayload,
} from "../queries/queries.js";

const fixedClock = { now: (): Date => new Date("2026-07-18T03:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  async execute(work) {
    return work(passthroughUnitOfWork);
  },
};

function ctxFor(
  engines: ReturnType<typeof createPlatformEngines>,
  identity: ReturnType<typeof createIdentityFoundation>,
  companyId = "company-rc62",
): ApplicationContext {
  return {
    correlationId: "corr-rc62",
    userId: "user-rc62",
    companyId,
    branchId: null,
    principal: null,
    metadata: {},
    clock: fixedClock,
    signal: null,
    policyEngine: identity.policyEngine,
    workflow: engines.workflow,
    approval: engines.approval,
    rules: engines.rules,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function meta() {
  return {
    correlationId: CorrelationId.from("corr-rc62"),
    causationId: null as ReturnType<typeof CausationId.from> | null,
    companyId: "company-rc62",
    actorId: "user-rc62",
    issuedAt: fixedClock.now(),
  };
}

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("cmd-rc62"),
    commandType,
    payload,
    metadata: meta(),
    idempotencyKey: null,
  };
}

function queryOf<T>(queryType: string, payload: T): Query<T> {
  return {
    queryId: QueryId.from("qry-rc62"),
    queryType,
    payload,
    metadata: meta(),
  };
}

describe("RC6.2 workflow operator handlers", () => {
  it("lists definitions, transitions instances, and lists approval requests", async () => {
    const identity = createIdentityFoundation({ clock: fixedClock });
    const seeded = await seedRbacCatalog({ store: identity.store });
    assert.ok(seeded.ok);
    assert.equal(seeded.value.platformPermissions.created, 14);

    const engines = createPlatformEngines({ identity, clock: fixedClock });
    const defs = await seedPlatformDefinitions({
      workflow: engines.workflow,
      approval: engines.approval,
    });
    assert.ok(defs.ok);

    const app = createWorkflowApplication();
    const ctx = ctxFor(engines, identity);

    const listDefs = app.handlers.resolveQuery(
      WorkflowQueryTypes.ListDefinitions,
    );
    assert.ok(listDefs);
    const definitions = await listDefs.handle(
      queryOf<ListWorkflowDefinitionsPayload>(
        WorkflowQueryTypes.ListDefinitions,
        { companyId: "company-rc62" },
      ),
      ctx,
    );
    assert.ok(definitions.ok);
    assert.ok(
      (definitions.value as readonly WorkflowDefinitionRecord[]).length >= 19,
    );

    const started = await engines.workflow.start({
      companyId: "company-rc62",
      definitionCode: "crm_lead_v1",
      subjectType: "crm.lead",
      subjectId: "lead-1",
      actorUserId: "user-rc62",
    });
    assert.ok(started.ok);

    const transition = app.handlers.resolveCommand(
      WorkflowCommandTypes.TransitionInstance,
    );
    assert.ok(transition);
    const transitioned = await transition.handle(
      commandOf<TransitionWorkflowInstancePayload>(
        WorkflowCommandTypes.TransitionInstance,
        {
          companyId: "company-rc62",
          instanceId: started.value.id,
          transitionCode: "qualify",
        },
      ),
      ctx,
    );
    assert.ok(transitioned.ok);
    assert.equal(
      (transitioned.value as WorkflowInstanceRecord).statusProjection,
      "qualified",
    );

    const available = app.handlers.resolveQuery(
      WorkflowQueryTypes.ListAvailableTransitions,
    );
    assert.ok(available);
    const transitions = await available.handle(
      queryOf<ListAvailableTransitionsPayload>(
        WorkflowQueryTypes.ListAvailableTransitions,
        {
          companyId: "company-rc62",
          instanceId: started.value.id,
        },
      ),
      ctx,
    );
    assert.ok(transitions.ok);
    assert.ok(
      (transitions.value as readonly WorkflowTransitionRecord[]).some(
        (t) => t.code === "convert",
      ),
    );

    const submitted = await engines.approval.submit({
      companyId: "company-rc62",
      type: "crm.lead_qualify",
      subjectType: "crm.lead",
      subjectId: "lead-1",
      submittedByUserId: "user-rc62",
    });
    assert.ok(submitted.ok);

    const listRequests = app.handlers.resolveQuery(
      ApprovalQueryTypes.ListRequests,
    );
    assert.ok(listRequests);
    const requests = await listRequests.handle(
      queryOf<ListApprovalRequestsPayload>(ApprovalQueryTypes.ListRequests, {
        companyId: "company-rc62",
        openOnly: true,
      }),
      ctx,
    );
    assert.ok(requests.ok);
    const openRequests = requests.value as readonly ApprovalRequestRecord[];
    assert.equal(openRequests.length, 1);
    assert.equal(openRequests[0]?.id, submitted.value.id);

    assert.equal(app.handlers.listCommandTypes().length, 8);
    assert.equal(app.handlers.listQueryTypes().length, 11);
  });
});
