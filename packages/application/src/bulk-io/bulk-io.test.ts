import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HandlerRegistry,
  createBulkIoHandlers,
  registerBulkIoHandlers,
  registerJobHandlers,
  type BulkIoEntityAdapter,
  type BackgroundJobRepository,
  type BackgroundJob,
} from "../index.js";
import {
  ok,
  fail,
  ValidationError,
  CommandId,
  CorrelationId,
  type Command,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";
import type { PolicyEngine, PolicyPrincipal } from "@afh/identity";

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from(
        "00000000-0000-4000-8000-000000000002",
      ),
      causationId: null,
      companyId: (payload as { companyId: string }).companyId,
      actorId: "user-1",
      issuedAt: new Date("2026-07-19T00:00:00.000Z"),
    },
    idempotencyKey: null,
  };
}

function adapterOk(): BulkIoEntityAdapter {
  return {
    importRow: async () => ok({ entityId: "e-1" }),
    updateRow: async () => ok({ entityId: "e-1" }),
    exportRows: async () => ok([{ id: "e-1", code: "A" }]),
  };
}

function memoryJobs(): BackgroundJobRepository {
  const map = new Map<string, BackgroundJob>();
  return {
    async findById(key) {
      return ok(map.get(`${key.companyId}:${key.id}`) ?? null);
    },
    async save(job) {
      map.set(`${job.companyId}:${job.id}`, job);
      return ok(undefined);
    },
    async listByCompany(companyId) {
      return ok([...map.values()].filter((j) => j.companyId === companyId));
    },
  };
}

function ctx(companyId = "co-1"): ApplicationContext {
  const principal = {
    userId: "u-1",
    companyId,
    roles: [],
  } as unknown as PolicyPrincipal;
  return {
    correlationId: "c-1",
    userId: "u-1",
    companyId,
    branchId: null,
    principal,
    metadata: {},
    clock: { now: () => new Date("2026-07-19T00:00:00.000Z") },
    signal: null,
    policyEngine: {
      async evaluate() {
        return { allowed: true, reasonCode: "ok", message: "ok" };
      },
      async buildPrincipal() {
        return principal;
      },
    } as unknown as PolicyEngine,
    workflow: null,
    approval: null,
    rules: null,
    outboxDispatcher: null,
    unitOfWork: {
      async execute(fn) {
        return fn({} as never);
      },
    },
  };
}

describe("RC7.7 bulk I/O handlers", () => {
  it("imports rows with partial-failure summary", async () => {
    const adapters = {
      "inventory.item": {
        ...adapterOk(),
        importRow: async ({ row }) => {
          if (row.code === "bad") {
            return fail(
              new ValidationError("bad", { code: "bulk_row_invalid" }),
            );
          }
          return ok({ entityId: "ok-1" });
        },
      } satisfies BulkIoEntityAdapter,
    };
    const handlers = createBulkIoHandlers({
      bindings: [
        {
          allowedEntityType: "inventory.item",
          resourceType: "inventory_item",
          importAction: "inventory.items.import",
          exportAction: "inventory.items.export",
          bulkUpdateAction: "inventory.items.bulk_update",
        },
      ],
      adapters,
    });
    const result = await handlers.importRows.handle(
      commandOf("bulk.ImportEntityRows", {
        companyId: "co-1",
        entityType: "inventory.item",
        rows: [{ code: "good", name: "G" }, { code: "bad" }],
      }),
      ctx(),
    );
    assert.ok(result.ok);
    assert.equal(result.value.succeeded, 1);
    assert.equal(result.value.failed, 1);
  });

  it("registers bulk and job handlers once", () => {
    const handlers = new HandlerRegistry();
    registerBulkIoHandlers(handlers, {
      bindings: [
        {
          allowedEntityType: "inventory.item",
          resourceType: "inventory_item",
          importAction: "inventory.items.import",
          exportAction: "inventory.items.export",
          bulkUpdateAction: "inventory.items.bulk_update",
        },
      ],
      adapters: { "inventory.item": adapterOk() },
    });
    registerJobHandlers(handlers, { jobs: memoryJobs() });
    assert.ok(handlers.listCommandTypes().includes("bulk.ImportEntityRows"));
    assert.ok(handlers.listCommandTypes().includes("jobs.EnqueueBackgroundJob"));
    assert.ok(handlers.listQueryTypes().includes("jobs.GetBackgroundJob"));
  });
});
