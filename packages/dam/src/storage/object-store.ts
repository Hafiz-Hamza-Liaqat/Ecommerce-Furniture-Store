/**
 * Opaque binary object storage contract — no provider implementation.
 */

import type { PlatformError, Result } from "@afh/shared-kernel";

export type ObjectStorePutInput = {
  readonly companyId: string;
  readonly assetId: string;
  readonly versionId: string;
  readonly bytes: Uint8Array;
  readonly mimeType: string | null;
};

export type ObjectStore = {
  put(
    input: ObjectStorePutInput,
  ): Promise<
    Result<{ storageRef: string; sizeBytes: number; checksum: string }, PlatformError>
  >;
  get(storageRef: string): Promise<Result<Uint8Array, PlatformError>>;
  exists(storageRef: string): Promise<Result<boolean, PlatformError>>;
};
