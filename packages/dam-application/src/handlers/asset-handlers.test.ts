/**
 * RC7.5 — DAM asset handler tests (Policy, object storage, company isolation).
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type {
  PolicyDecision,
  PolicyEngine,
  PolicyPrincipal,
  PolicyResource,
  SecurityAuditService,
} from "@afh/identity";
import type {
  AssetRepository,
  AssetVersion,
  AssetVersionRepository,
  DigitalAsset,
  ObjectStore,
} from "@afh/dam";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type Page,
  type PageRequest,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "@afh/application";
import {
  createCreateAssetHandler,
  createGetAssetHandler,
  createListAssetHandler,
  type CreateAssetResult,
} from "./asset-handlers.js";
import type { DamHandlerDeps } from "./deps.js";
import {
  DamCommandTypes,
  DamPolicyActions,
  DamQueryTypes,
  DEFAULT_MAX_ASSET_BYTES,
} from "../constants.js";

const clock: Clock = { now: () => new Date("2026-07-19T00:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

const stubAudit = {
  async record() {
    return;
  },
} as unknown as SecurityAuditService;

function pageSlice<T>(items: readonly T[], page?: PageRequest): Page<T> {
  const pageNum = page && "page" in page ? Math.max(1, page.page) : 1;
  const pageSize =
    page && "pageSize" in page ? Math.max(1, page.pageSize) : 100;
  const offset = (pageNum - 1) * pageSize;
  const slice = items.slice(offset, offset + pageSize);
  return {
    items: slice,
    totalCount: items.length,
    page: pageNum,
    pageSize,
    nextCursor: null,
    hasMore: offset + slice.length < items.length,
  };
}

function makeAsset(
  partial: Partial<DigitalAsset> &
    Pick<DigitalAsset, "id" | "companyId" | "name">,
): DigitalAsset {
  return {
    code: null,
    assetType: "document",
    status: "active",
    classification: "general",
    visibility: "internal",
    mimeType: "application/pdf",
    currentVersionId: null,
    folderId: null,
    uploadedByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

function createMemoryAssetRepo(initial: DigitalAsset[] = []): AssetRepository {
  const store = new Map(
    initial.map((asset) => [`${asset.companyId}:${asset.id}`, asset]),
  );
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId}:${key.id}`) ?? null);
    },
    async save(asset) {
      store.set(`${asset.companyId}:${asset.id}`, asset);
      return ok(undefined);
    },
    async remove(key) {
      store.delete(`${key.companyId}:${key.id}`);
      return ok(undefined);
    },
    async listByCompany(companyId, page) {
      const items = [...store.values()].filter((a) => a.companyId === companyId);
      return ok(pageSlice(items, page));
    },
  };
}

function createMemoryVersionRepo(): AssetVersionRepository {
  const store = new Map<string, AssetVersion>();
  return {
    async findById(key) {
      return ok(store.get(`${key.companyId}:${key.id}`) ?? null);
    },
    async save(version) {
      store.set(`${version.companyId}:${version.id}`, version);
      return ok(undefined);
    },
    async listByAsset(companyId, assetId, page) {
      const items = [...store.values()].filter(
        (v) => v.companyId === companyId && v.assetId === assetId,
      );
      return ok(pageSlice(items, page));
    },
  };
}

function createMemoryObjectStore(): ObjectStore {
  const store = new Map<string, Uint8Array>();
  return {
    async put(input) {
      const storageRef = `mem:${input.companyId}/${input.assetId}/${input.versionId}`;
      store.set(storageRef, input.bytes);
      return ok({
        storageRef,
        sizeBytes: input.bytes.byteLength,
        checksum: "test-checksum",
      });
    },
    async get(storageRef) {
      const bytes = store.get(storageRef);
      if (!bytes) {
        return ok(new Uint8Array());
      }
      return ok(bytes);
    },
    async exists(storageRef) {
      return ok(store.has(storageRef));
    },
  };
}

function principal(
  userId: string,
  permission: string,
): PolicyPrincipal {
  return {
    userId,
    companyId: "co-1",
    roles: [
      {
        roleCode: "dam",
        scopeType: "company",
        scopeId: "co-1",
        permissionCodes: [permission],
      },
    ],
    permissionCodes: [permission],
  };
}

function policyAllowCompany(): PolicyEngine {
  return {
    async evaluate(
      _p: PolicyPrincipal,
      _action: string,
      resource: PolicyResource,
    ): Promise<PolicyDecision> {
      if (resource.companyId === "co-1") {
        return { allowed: true };
      }
      return {
        allowed: false,
        reasonCode: "company_mismatch",
        message: "company",
      };
    },
  };
}

function policyDenyAll(): PolicyEngine {
  return {
    async evaluate(): Promise<PolicyDecision> {
      return {
        allowed: false,
        reasonCode: "denied",
        message: "denied",
      };
    },
  };
}

function makeCtx(
  userId: string,
  permission: string,
  policyEngine: PolicyEngine = policyAllowCompany(),
): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId,
    companyId: "co-1",
    branchId: null,
    principal: principal(userId, permission),
    metadata: {},
    clock,
    signal: null,
    policyEngine,
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function commandOf<T>(commandType: string, payload: T): Command<T> {
  return {
    commandId: CommandId.from("00000000-0000-4000-8000-000000000001"),
    commandType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000002"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
    idempotencyKey: null,
  };
}

function queryOf<T>(queryType: string, payload: T): Query<T> {
  return {
    queryId: QueryId.from("00000000-0000-4000-8000-000000000003"),
    queryType,
    payload,
    metadata: {
      correlationId: CorrelationId.from("00000000-0000-4000-8000-000000000004"),
      causationId: null,
      companyId: (payload as { companyId?: string }).companyId ?? null,
      actorId: "user-1",
      issuedAt: new Date(),
    },
  };
}

function damDeps(
  assets: AssetRepository,
  versions: AssetVersionRepository,
  objectStore: ObjectStore,
): DamHandlerDeps {
  return { assets, versions, objectStore, audit: stubAudit };
}

describe("RC7.5 DAM asset handlers", () => {
  it("CreateAsset stores bytes and returns storageRef", async () => {
    const objectStore = createMemoryObjectStore();
    const assets = createMemoryAssetRepo();
    const versions = createMemoryVersionRepo();
    const handler = createCreateAssetHandler(
      damDeps(assets, versions, objectStore),
    );

    const result = await handler.handle(
      commandOf(DamCommandTypes.CreateAsset, {
        companyId: "co-1",
        name: "Spec sheet",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("hello-dam").toString("base64"),
        fileName: "spec.pdf",
      }),
      makeCtx("user-1", DamPolicyActions.AssetCreate),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const created = result.value as CreateAssetResult;
    assert.ok(created.storageRef);
    assert.ok(created.versionId);

    const stored = await objectStore.get(created.storageRef!);
    assert.ok(stored.ok);
    assert.equal(Buffer.from(stored.value).toString("utf8"), "hello-dam");
  });

  it("CreateAsset rejects disallowed MIME type", async () => {
    const handler = createCreateAssetHandler(
      damDeps(
        createMemoryAssetRepo(),
        createMemoryVersionRepo(),
        createMemoryObjectStore(),
      ),
    );

    const result = await handler.handle(
      commandOf(DamCommandTypes.CreateAsset, {
        companyId: "co-1",
        name: "Bad file",
        mimeType: "application/x-msdownload",
        contentBase64: Buffer.from("bad").toString("base64"),
      }),
      makeCtx("user-1", DamPolicyActions.AssetCreate),
    );

    assert.ok(!result.ok);
    assert.equal(result.error.code, "mime_type_not_allowed");
  });

  it("CreateAsset rejects oversized content", async () => {
    const handler = createCreateAssetHandler(
      damDeps(
        createMemoryAssetRepo(),
        createMemoryVersionRepo(),
        createMemoryObjectStore(),
      ),
    );

    const oversized = Buffer.alloc(DEFAULT_MAX_ASSET_BYTES + 1, 1);
    const result = await handler.handle(
      commandOf(DamCommandTypes.CreateAsset, {
        companyId: "co-1",
        name: "Huge file",
        mimeType: "application/pdf",
        contentBase64: oversized.toString("base64"),
      }),
      makeCtx("user-1", DamPolicyActions.AssetCreate),
    );

    assert.ok(!result.ok);
    assert.equal(result.error.code, "asset_content_too_large");
  });

  it("GetAsset authorization fails closed when Policy denies read", async () => {
    const asset = makeAsset({
      id: "asset-1",
      companyId: "co-1",
      name: "Locked",
    });
    const handler = createGetAssetHandler(
      damDeps(
        createMemoryAssetRepo([asset]),
        createMemoryVersionRepo(),
        createMemoryObjectStore(),
      ),
    );

    const query = queryOf(DamQueryTypes.GetAsset, {
      companyId: "co-1",
      assetId: "asset-1",
    });

    const ctx = makeCtx("user-2", DamPolicyActions.AssetRead, policyDenyAll());
    assert.ok(handler.authorize);
    const authSpec = await handler.authorize(query, ctx);
    const decision = await ctx.policyEngine.evaluate(
      ctx.principal!,
      authSpec.action,
      authSpec.resource,
    );
    assert.equal(decision.allowed, false);
  });

  it("ListAsset enforces company isolation via authorized totals", async () => {
    const handler = createListAssetHandler(
      damDeps(
        createMemoryAssetRepo([
          makeAsset({ id: "a1", companyId: "co-1", name: "Co1 A" }),
          makeAsset({ id: "a2", companyId: "co-1", name: "Co1 B" }),
          makeAsset({ id: "a3", companyId: "co-2", name: "Co2 A" }),
        ]),
        createMemoryVersionRepo(),
        createMemoryObjectStore(),
      ),
    );

    const result = await handler.handle(
      queryOf(DamQueryTypes.ListAsset, { companyId: "co-1" }),
      makeCtx("user-3", DamPolicyActions.AssetRead),
    );
    assert.ok(result.ok, result.ok ? "" : result.error.message);
    if (!result.ok) return;
    const page = result.value as Page<DigitalAsset>;
    assert.equal(page.totalCount, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.items.every((item) => item.companyId === "co-1"));
  });

  it("CreateAsset persists bytes via filesystem object store", async () => {
    const { createFilesystemObjectStore } = await import("@afh/persistence-sql");
    const root = await mkdtemp(path.join(os.tmpdir(), "dam-test-"));
    try {
      const objectStore = createFilesystemObjectStore(root);
      const handler = createCreateAssetHandler(
        damDeps(
          createMemoryAssetRepo(),
          createMemoryVersionRepo(),
          objectStore,
        ),
      );

      const result = await handler.handle(
        commandOf(DamCommandTypes.CreateAsset, {
          companyId: "co-1",
          name: "FS asset",
          mimeType: "text/plain",
          contentBase64: Buffer.from("filesystem-bytes").toString("base64"),
        }),
        makeCtx("user-1", DamPolicyActions.AssetCreate),
      );

      assert.ok(result.ok, result.ok ? "" : result.error.message);
      if (!result.ok) return;
      const created = result.value as CreateAssetResult;
      assert.ok(created.storageRef?.startsWith("fs:"));
      const bytes = await objectStore.get(created.storageRef!);
      assert.ok(bytes.ok);
      assert.equal(Buffer.from(bytes.value).toString("utf8"), "filesystem-bytes");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
