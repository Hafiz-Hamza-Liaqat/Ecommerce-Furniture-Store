/**
 * RC5.9 — Authorization observability: allow/deny audit, reason-code catalog,
 * metrics, and Policy performance disposition.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  InMemorySecurityAuditStore,
  SecurityAuditService,
} from "../audit/security-audit.js";
import { InMemoryIdentityStore } from "../stores/identity-store.js";
import { RBAC_CATALOG_VERSION } from "../rbac/catalog/permission-catalog.js";
import {
  RbacPolicyEngine,
  type PolicyPrincipal,
  type PolicyResource,
} from "./policy-engine.js";
import {
  ALL_AUTHZ_REASON_CODES,
  APPLICATION_AUTHZ_REASON_CODES,
  ENHANCED_POLICY_DENY_REASON_CODES,
  POLICY_ENGINE_DENY_REASON_CODES,
  POLICY_ENGINE_NAME,
  POLICY_ENGINE_VERSION,
  isKnownAuthzReasonCode,
  isPolicyEngineDenyReasonCode,
} from "./reason-codes.js";

const COMPANY = "company-obs";
const ACTION = "sales.opportunities.read";

const fixedClock = { now: (): Date => new Date("2026-07-18T12:00:00.000Z") };

class RecordingMetrics {
  readonly counters = new Map<string, number>();
  readonly histograms = new Map<string, number[]>();

  counter(name: string) {
    return {
      add: (value: number) => {
        this.counters.set(name, (this.counters.get(name) ?? 0) + value);
      },
    };
  }

  histogram(name: string) {
    return {
      record: (value: number) => {
        const samples = this.histograms.get(name) ?? [];
        samples.push(value);
        this.histograms.set(name, samples);
      },
    };
  }

  gauge() {
    return { set: () => undefined };
  }
}

function boundPrincipal(
  overrides: Partial<PolicyPrincipal> = {},
): PolicyPrincipal {
  return {
    userId: "user-obs",
    companyId: COMPANY,
    roles: [
      {
        roleCode: "sales_manager",
        scopeType: "company",
        scopeId: null,
        permissionCodes: [ACTION],
      },
    ],
    permissionCodes: [ACTION],
    ...overrides,
  };
}

function resource(overrides: Partial<PolicyResource> = {}): PolicyResource {
  return {
    type: "opportunity",
    id: "opp-1",
    companyId: COMPANY,
    ownerUserId: null,
    organizationId: null,
    branchId: null,
    ...overrides,
  };
}

describe("RC5.9 stable reason-code catalog", () => {
  it("freezes the Policy Engine deny reason codes", () => {
    assert.deepEqual([...POLICY_ENGINE_DENY_REASON_CODES], [
      "permission_missing",
      "company_isolation",
      "scope_mismatch",
    ]);
    assert.ok(isPolicyEngineDenyReasonCode("permission_missing"));
    assert.ok(!isPolicyEngineDenyReasonCode("unauthenticated"));
  });

  it("includes Enhanced Policy and application authz codes in the known set", () => {
    for (const code of ENHANCED_POLICY_DENY_REASON_CODES) {
      assert.ok(isKnownAuthzReasonCode(code));
    }
    for (const code of APPLICATION_AUTHZ_REASON_CODES) {
      assert.ok(isKnownAuthzReasonCode(code));
    }
    assert.equal(ALL_AUTHZ_REASON_CODES.length, 10);
    assert.ok(!isKnownAuthzReasonCode("not_a_real_reason"));
  });
});

describe("RC5.9 policy.allow and policy.deny audit records", () => {
  it("records policy.allow with engine, catalog, and contributing roles", async () => {
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      audit,
    );

    const decision = await engine.evaluate(
      boundPrincipal(),
      ACTION,
      resource(),
      { correlationId: "corr-allow-1" },
    );
    assert.ok(decision.allowed);

    const record = auditStore.records.find((r) => r.action === "policy.allow");
    assert.ok(record, "policy.allow must be written");
    assert.equal(record.outcome, "success");
    assert.equal(record.actorUserId, "user-obs");
    assert.equal(record.companyId, COMPANY);
    assert.equal(record.entityType, "opportunity");
    assert.equal(record.entityId, "opp-1");
    assert.equal(record.correlationId, "corr-allow-1");
    assert.equal(record.details["permission"], ACTION);
    assert.equal(record.details["decision"], "allow");
    assert.equal(record.details["engine"], POLICY_ENGINE_NAME);
    assert.equal(record.details["engineVersion"], POLICY_ENGINE_VERSION);
    assert.equal(record.details["catalogVersion"], RBAC_CATALOG_VERSION);
    assert.equal(record.details["scopeBinding"], "bound");
    assert.deepEqual(record.details["contributingRoles"], [
      {
        roleCode: "sales_manager",
        scopeType: "company",
        scopeId: null,
      },
    ]);
  });

  it("records policy.deny with the stable reason code and enriched details", async () => {
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      audit,
    );

    const decision = await engine.evaluate(
      boundPrincipal({ permissionCodes: [] }),
      ACTION,
      resource(),
      { correlationId: "corr-deny-1" },
    );
    assert.ok(!decision.allowed);
    assert.equal(decision.reasonCode, "permission_missing");

    const record = auditStore.records.find((r) => r.action === "policy.deny");
    assert.ok(record, "policy.deny must be written");
    assert.equal(record.outcome, "failure");
    assert.equal(record.details["reasonCode"], "permission_missing");
    assert.equal(record.details["engine"], POLICY_ENGINE_NAME);
    assert.equal(record.details["catalogVersion"], RBAC_CATALOG_VERSION);
    assert.equal(record.correlationId, "corr-deny-1");
  });

  it("audits company_isolation and scope_mismatch with their frozen reason codes", async () => {
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      audit,
    );

    const crossCompany = await engine.evaluate(
      boundPrincipal(),
      ACTION,
      resource({ companyId: "other-company" }),
      { correlationId: "corr-company" },
    );
    assert.ok(!crossCompany.allowed);
    assert.equal(crossCompany.reasonCode, "company_isolation");
    assert.equal(
      audit.recentRecords().find((r) => r.correlationId === "corr-company")
        ?.details["reasonCode"],
      "company_isolation",
    );

    const scoped = boundPrincipal({
      roles: [
        {
          roleCode: "sales_manager",
          scopeType: "own",
          scopeId: null,
          permissionCodes: [ACTION],
        },
      ],
    });
    const scopeDeny = await engine.evaluate(
      scoped,
      ACTION,
      resource({ ownerUserId: "someone-else" }),
      { correlationId: "corr-scope" },
    );
    assert.ok(!scopeDeny.allowed);
    assert.equal(scopeDeny.reasonCode, "scope_mismatch");
    assert.equal(
      audit.recentRecords().find((r) => r.correlationId === "corr-scope")
        ?.details["reasonCode"],
      "scope_mismatch",
    );
  });

  it("fails closed when the audit store rejects a write", async () => {
    const failingStore = {
      async append() {
        throw new Error("audit sink unavailable");
      },
    };
    const audit = new SecurityAuditService(failingStore, fixedClock);
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      audit,
    );
    await assert.rejects(
      () => engine.evaluate(boundPrincipal(), ACTION, resource()),
      /audit sink unavailable/,
    );
  });

  it("marks legacy principals in audit details and increments the legacy metric", async () => {
    const auditStore = new InMemorySecurityAuditStore();
    const audit = new SecurityAuditService(auditStore, fixedClock);
    const metrics = new RecordingMetrics();
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      audit,
      metrics,
    );

    const legacy = boundPrincipal({
      roles: [
        { roleCode: "sales_manager", scopeType: "company", scopeId: null },
      ],
    });
    const decision = await engine.evaluate(legacy, ACTION, resource(), {
      correlationId: "corr-legacy",
    });
    assert.ok(decision.allowed);

    const record = auditStore.records.find((r) => r.action === "policy.allow");
    assert.equal(record?.details["scopeBinding"], "legacy");
    assert.ok((metrics.counters.get("authz.policy.legacy_principal") ?? 0) >= 1);
  });
});

describe("RC5.9 authorization metrics", () => {
  it("counts allow and deny decisions and records evaluate duration", async () => {
    const metrics = new RecordingMetrics();
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
      undefined,
      metrics,
    );

    await engine.evaluate(boundPrincipal(), ACTION, resource());
    await engine.evaluate(
      boundPrincipal({ permissionCodes: [] }),
      ACTION,
      resource(),
    );

    assert.equal(metrics.counters.get("authz.policy.decision"), 2);
    const durations = metrics.histograms.get("authz.policy.duration_ms") ?? [];
    assert.equal(durations.length, 2);
  });
});

describe("RC5.9 Policy performance disposition", () => {
  it("keeps in-process evaluate p95 under the governance goal (≤ 10 ms)", async () => {
    const engine = new RbacPolicyEngine(
      new InMemoryIdentityStore(),
      fixedClock,
    );
    const principal = boundPrincipal();
    const res = resource();
    const samples: number[] = [];
    const iterations = 200;

    // Warmup
    for (let i = 0; i < 20; i += 1) {
      await engine.evaluate(principal, ACTION, res);
    }
    for (let i = 0; i < iterations; i += 1) {
      const started = performance.now();
      await engine.evaluate(
        i % 5 === 0 ? boundPrincipal({ permissionCodes: [] }) : principal,
        ACTION,
        res,
      );
      samples.push(performance.now() - started);
    }

    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95) - 1]!;
    const p99 = samples[Math.floor(samples.length * 0.99) - 1]!;
    assert.ok(
      p95 <= 10,
      `Policy evaluate p95=${p95.toFixed(3)}ms exceeds 10ms goal`,
    );
    assert.ok(
      p99 <= 25,
      `Policy evaluate p99=${p99.toFixed(3)}ms exceeds 25ms goal`,
    );
  });
});
