import {
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { BulkIoEntityBinding } from "./types.js";

export function resolveBulkBinding(
  bindings: readonly BulkIoEntityBinding[],
  entityType: string,
): Result<BulkIoEntityBinding, PlatformError> {
  const match = bindings.find((b) => b.allowedEntityType === entityType);
  if (!match) {
    return fail(
      new ValidationError("entityType is not supported for bulk I/O", {
        code: "bulk_entity_type_unsupported",
        details: { entityType },
      }),
    );
  }
  return ok(match);
}
