/**
 * Filesystem-backed ObjectStore adapter — local binary persistence only.
 */

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStore, ObjectStorePutInput } from "@afh/dam";
import {
  InfrastructureError,
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";

const STORAGE_REF_PREFIX = "fs:";

function isSafeSegment(value: string): boolean {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
}

function buildStorageRef(
  companyId: string,
  assetId: string,
  versionId: string,
): string {
  return `${STORAGE_REF_PREFIX}${companyId}/${assetId}/${versionId}`;
}

function parseStorageRef(
  storageRef: string,
): { companyId: string; assetId: string; versionId: string } | null {
  if (!storageRef.startsWith(STORAGE_REF_PREFIX)) {
    return null;
  }
  const parts = storageRef.slice(STORAGE_REF_PREFIX.length).split("/");
  if (parts.length !== 3) {
    return null;
  }
  const [companyId, assetId, versionId] = parts;
  if (!companyId || !assetId || !versionId) {
    return null;
  }
  if (!isSafeSegment(companyId) || !isSafeSegment(assetId) || !isSafeSegment(versionId)) {
    return null;
  }
  return { companyId, assetId, versionId };
}

function resolveObjectPath(
  rootDir: string,
  companyId: string,
  assetId: string,
  versionId: string,
): Result<string, PlatformError> {
  if (!isSafeSegment(companyId) || !isSafeSegment(assetId) || !isSafeSegment(versionId)) {
    return fail(
      new ValidationError("Invalid object storage path segment", {
        code: "object_store_path_traversal",
      }),
    );
  }

  const filePath = path.join(rootDir, companyId, assetId, `${versionId}.bin`);
  const normalizedRoot = path.resolve(rootDir);
  const normalizedFile = path.resolve(filePath);
  const rootWithSep =
    normalizedRoot.endsWith(path.sep) ? normalizedRoot : `${normalizedRoot}${path.sep}`;

  if (!normalizedFile.startsWith(rootWithSep)) {
    return fail(
      new ValidationError("Object storage path escapes root directory", {
        code: "object_store_path_traversal",
      }),
    );
  }

  return ok(normalizedFile);
}

function sha256Checksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createFilesystemObjectStore(rootDir: string): ObjectStore {
  const resolvedRoot = path.resolve(rootDir);

  return {
    async put(
      input: ObjectStorePutInput,
    ): Promise<
      Result<{ storageRef: string; sizeBytes: number; checksum: string }, PlatformError>
    > {
      const resolved = resolveObjectPath(
        resolvedRoot,
        input.companyId,
        input.assetId,
        input.versionId,
      );
      if (!resolved.ok) {
        return resolved;
      }

      try {
        await mkdir(path.dirname(resolved.value), { recursive: true });
        await writeFile(resolved.value, input.bytes);
      } catch (error) {
        return fail(
          new InfrastructureError("Failed to write object storage file", {
            code: "object_store_write_failed",
            cause: error,
          }),
        );
      }

      return ok({
        storageRef: buildStorageRef(input.companyId, input.assetId, input.versionId),
        sizeBytes: input.bytes.byteLength,
        checksum: sha256Checksum(input.bytes),
      });
    },

    async get(storageRef: string): Promise<Result<Uint8Array, PlatformError>> {
      const parsed = parseStorageRef(storageRef);
      if (!parsed) {
        return fail(
          new ValidationError("Invalid object storage reference", {
            code: "object_store_invalid_ref",
          }),
        );
      }

      const resolved = resolveObjectPath(
        resolvedRoot,
        parsed.companyId,
        parsed.assetId,
        parsed.versionId,
      );
      if (!resolved.ok) {
        return resolved;
      }

      try {
        const bytes = await readFile(resolved.value);
        return ok(new Uint8Array(bytes));
      } catch (error) {
        return fail(
          new InfrastructureError("Failed to read object storage file", {
            code: "object_store_read_failed",
            cause: error,
          }),
        );
      }
    },

    async exists(storageRef: string): Promise<Result<boolean, PlatformError>> {
      const parsed = parseStorageRef(storageRef);
      if (!parsed) {
        return fail(
          new ValidationError("Invalid object storage reference", {
            code: "object_store_invalid_ref",
          }),
        );
      }

      const resolved = resolveObjectPath(
        resolvedRoot,
        parsed.companyId,
        parsed.assetId,
        parsed.versionId,
      );
      if (!resolved.ok) {
        return resolved;
      }

      try {
        await access(resolved.value);
        return ok(true);
      } catch {
        return ok(false);
      }
    },
  };
}
