/**
 * RC7.5 — DAM upload router stores bytes via ObjectStore.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssetRepository, AssetVersion, AssetVersionRepository, DigitalAsset } from "@afh/dam";
import { ok, type Page, type PageRequest } from "@afh/shared-kernel";
import { createDamUploadRouter } from "./upload-router.js";

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

describe("RC7.5 createDamUploadRouter", () => {
  it("stores rawBody bytes and creates an asset version", async () => {
    const assets: DigitalAsset[] = [];
    const versions: AssetVersion[] = [];
    const objectBytes = new Map<string, Uint8Array>();

    const assetRepo: AssetRepository = {
      async findById(key) {
        return ok(
          assets.find((a) => a.companyId === key.companyId && a.id === key.id) ??
            null,
        );
      },
      async save(asset) {
        assets.push(asset);
        return ok(undefined);
      },
      async remove() {
        return ok(undefined);
      },
      async listByCompany(companyId, page) {
        return ok(pageSlice(assets.filter((a) => a.companyId === companyId), page));
      },
    };

    const versionRepo: AssetVersionRepository = {
      async findById(key) {
        return ok(
          versions.find((v) => v.companyId === key.companyId && v.id === key.id) ??
            null,
        );
      },
      async save(version) {
        versions.push(version);
        return ok(undefined);
      },
      async listByAsset(companyId, assetId, page) {
        return ok(
          pageSlice(
            versions.filter(
              (v) => v.companyId === companyId && v.assetId === assetId,
            ),
            page,
          ),
        );
      },
    };

    const router = createDamUploadRouter({
      assets: assetRepo,
      versions: versionRepo,
      objectStore: {
        async put(input) {
          const storageRef = `mem:${input.companyId}/${input.assetId}/${input.versionId}`;
          objectBytes.set(storageRef, input.bytes);
          return ok({
            storageRef,
            sizeBytes: input.bytes.byteLength,
            checksum: "abc",
          });
        },
        async get(storageRef) {
          return ok(objectBytes.get(storageRef) ?? new Uint8Array());
        },
        async exists(storageRef) {
          return ok(objectBytes.has(storageRef));
        },
      },
      clock: { now: () => new Date("2026-07-19T00:00:00.000Z") },
    });

    const accepted = await router.routeUpload({
      dto: {
        companyId: "co-1",
        name: "logo.png",
        mimeType: "image/png",
      },
      uploadedByUserId: "user-1",
      rawBody: new Uint8Array([1, 2, 3, 4]),
    });

    assert.ok(accepted.ok, accepted.ok ? "" : accepted.error.message);
    assert.equal(assets.length, 1);
    assert.equal(assets[0]?.status, "active");
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.metadata.storageRef, accepted.value.storageRef);
    assert.deepEqual(
      [...(objectBytes.get(accepted.value.storageRef!) ?? [])],
      [1, 2, 3, 4],
    );
  });

  it("allows metadata-only draft when rawBody is empty", async () => {
    const assets: DigitalAsset[] = [];
    const router = createDamUploadRouter({
      assets: {
        async findById() {
          return ok(null);
        },
        async save(asset) {
          assets.push(asset);
          return ok(undefined);
        },
        async remove() {
          return ok(undefined);
        },
        async listByCompany() {
          return ok(pageSlice([]));
        },
      },
      versions: {
        async findById() {
          return ok(null);
        },
        async save() {
          return ok(undefined);
        },
        async listByAsset() {
          return ok(pageSlice([]));
        },
      },
      objectStore: {
        async put() {
          throw new Error("unexpected put");
        },
        async get() {
          return ok(new Uint8Array());
        },
        async exists() {
          return ok(false);
        },
      },
      clock: { now: () => new Date("2026-07-19T00:00:00.000Z") },
    });

    const accepted = await router.routeUpload({
      dto: {
        companyId: "co-1",
        name: "Draft only",
      },
      uploadedByUserId: null,
      rawBody: null,
    });

    assert.ok(accepted.ok);
    assert.equal(assets[0]?.status, "draft");
    assert.equal(assets[0]?.currentVersionId, null);
  });
});
