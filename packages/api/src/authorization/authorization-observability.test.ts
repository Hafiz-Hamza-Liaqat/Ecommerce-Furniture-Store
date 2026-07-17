/**
 * RC5.9 — Authorization observability through the behavior pipeline:
 * allow and deny both produce SecurityAuditService records with correlation ids.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIdentityFoundation,
  seedRbacCatalog,
  InMemorySecurityAuditStore,
  type PolicyPrincipal,
  type UserRecord,
} from "@afh/identity";
import {
  AuthorizationBehavior,
  ExceptionMappingBehavior,
  type ApplicationContext,
  type CommandPipelineContext,
} from "@afh/application";
import {
  SalesCommandTypes,
  createUpdateOpportunityHandler,
  type UpdateOpportunityPayload,
  type SalesHandlerDeps,
} from "@afh/sales-application";
import type { Opportunity } from "@afh/sales";
import {
  CommandId,
  CorrelationId,
  ok,
  type Command,
  type PlatformError,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";

const COMPANY = "company-obs-pipe";

function activeUser(id: string): UserRecord {
  const now = new Date().toISOString();
  return {
    id,
    companyId: COMPANY,
    email: `${id}@example.test`,
    phone: null,
    passwordHash: null,
    status: "active",
    principalKind: "human",
    emailVerifiedAt: now,
    phoneVerifiedAt: null,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    locale: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

async function seededPrincipal(): Promise<{
  principal: PolicyPrincipal;
  identity: ReturnType<typeof createIdentityFoundation>;
  auditStore: InMemorySecurityAuditStore;
}> {
  const auditStore = new InMemorySecurityAuditStore();
  const identity = createIdentityFoundation({ auditStore });
  const seeded = await seedRbacCatalog({ store: identity.store });
  assert.ok(seeded.ok);

  const user = activeUser("user-obs-pipe");
  await identity.store.saveUser(user);
  const role = await identity.store.getRoleByCode(null, "sales_manager");
  assert.ok(role);
  const assigned = await identity.rbac.assignRole({
    companyId: COMPANY,
    userId: user.id,
    roleId: role.id,
    scopeType: "company",
    scopeId: null,
  });
  assert.ok(assigned.ok);

  const principal = await identity.policyEngine.buildPrincipal(user.id);
  assert.ok(principal);
  return { principal, identity, auditStore };
}

function opportunity(owner: string | null): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-obs-1",
    companyId: COMPANY,
    code: null,
    title: "Observability opportunity",
    status: "open",
    source: null,
    customerId: "cust-1",
    organizationId: null,
    salesRepUserId: owner,
    territoryId: null,
    projectId: null,
    estimatedValueRef: null,
    currencyCode: null,
    createdAt: now,
    updatedAt: now,
  };
}

function salesDeps(record: Opportunity): SalesHandlerDeps {
  return {
    opportunities: {
      async findById() {
        return ok(record);
      },
    },
  } as unknown as SalesHandlerDeps;
}

function appContext(
  identity: ReturnType<typeof createIdentityFoundation>,
  principal: PolicyPrincipal,
): ApplicationContext {
  return {
    correlationId: "rc59-obs-pipeline",
    userId: principal.userId,
    companyId: COMPANY,
    branchId: null,
    principal,
    metadata: {},
    clock: identity.clock,
    signal: null,
    policyEngine: identity.policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

async function dispatchUpdate(
  identity: ReturnType<typeof createIdentityFoundation>,
  principal: PolicyPrincipal,
  deps: SalesHandlerDeps,
): Promise<Result<string, PlatformError>> {
  const command: Command<UpdateOpportunityPayload> = {
    commandId: CommandId.from("cmd-obs-1"),
    commandType: SalesCommandTypes.UpdateOpportunity,
    payload: {
      companyId: COMPANY,
      opportunityId: "opp-obs-1",
      title: "Renamed",
    },
    metadata: {
      correlationId: CorrelationId.from("rc59-obs-pipeline"),
      causationId: null,
      companyId: COMPANY,
      actorId: null,
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
  const ctx: CommandPipelineContext<UpdateOpportunityPayload> = {
    command,
    app: appContext(identity, principal),
    handler: createUpdateOpportunityHandler(deps),
  };
  const exceptionMapping = new ExceptionMappingBehavior();
  const authorization = new AuthorizationBehavior(identity.policyEngine);
  return exceptionMapping.execute(ctx, () =>
    authorization.execute(ctx, async () => ok("handled")),
  );
}

describe("RC5.9 pipeline authorization audit", () => {
  it("writes policy.allow with the request correlation id on a permitted command", async () => {
    const { principal, identity, auditStore } = await seededPrincipal();
    const result = await dispatchUpdate(
      identity,
      principal,
      salesDeps(opportunity("user-obs-pipe")),
    );
    assert.ok(result.ok);

    const allow = auditStore.records.find((r) => r.action === "policy.allow");
    assert.ok(allow, "pipeline allow must be audited");
    assert.equal(allow.correlationId, "rc59-obs-pipeline");
    assert.equal(allow.details["decision"], "allow");
    assert.equal(typeof allow.details["permission"], "string");
  });

  it("writes policy.deny with a stable reason code when permission is missing", async () => {
    const { principal, identity, auditStore } = await seededPrincipal();
    const stripped: PolicyPrincipal = {
      ...principal,
      permissionCodes: [],
      roles: principal.roles.map((r) => ({ ...r, permissionCodes: [] })),
    };
    const result = await dispatchUpdate(
      identity,
      stripped,
      salesDeps(opportunity("user-obs-pipe")),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, "permission_missing");

    const deny = auditStore.records.find((r) => r.action === "policy.deny");
    assert.ok(deny, "pipeline deny must be audited");
    assert.equal(deny.correlationId, "rc59-obs-pipeline");
    assert.equal(deny.details["reasonCode"], "permission_missing");
  });
});
