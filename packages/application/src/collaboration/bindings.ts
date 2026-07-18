import {
  ValidationError,
  fail,
  ok,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type {
  CollaborationEntityBinding,
  CollaborationParentBinding,
} from "./types.js";

export type LegacyCollaborationBindingDeps = {
  readonly binding: CollaborationParentBinding;
  readonly allowedEntityType: string;
};

export type MultiCollaborationBindingDeps = {
  readonly bindings: readonly CollaborationEntityBinding[];
};

export function normalizeCollaborationBindings(
  deps: LegacyCollaborationBindingDeps | MultiCollaborationBindingDeps,
): readonly CollaborationEntityBinding[] {
  if ("bindings" in deps && deps.bindings.length > 0) {
    return deps.bindings;
  }
  if ("binding" in deps && "allowedEntityType" in deps) {
    return [
      {
        allowedEntityType: deps.allowedEntityType,
        parent: deps.binding,
      },
    ];
  }
  throw new Error(
    "Collaboration handlers require bindings or legacy binding + allowedEntityType",
  );
}

export function resolveBinding(
  bindings: readonly CollaborationEntityBinding[],
  entityType: string,
): Result<CollaborationEntityBinding, PlatformError> {
  const match = bindings.find((b) => b.allowedEntityType === entityType);
  if (!match) {
    return fail(
      new ValidationError("entityType is not supported", {
        code: "entity_type_unsupported",
        details: { entityType },
      }),
    );
  }
  return ok(match);
}

export function firstBindingParent(
  bindings: readonly CollaborationEntityBinding[],
): CollaborationParentBinding {
  const first = bindings[0];
  if (!first) {
    throw new Error("Collaboration bindings must not be empty");
  }
  return first.parent;
}
