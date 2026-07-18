/**
 * RC7.4 — shared collaboration foundation (notes + attachment links).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SecurityAuditService } from "@afh/identity";
import {
  CommandId,
  CorrelationId,
  QueryId,
  ok,
  type Clock,
  type Command,
  type PlatformError,
  type Query,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";
import {
  CollaborationCommandTypes,
  CollaborationQueryTypes,
  createCollaborationAttachmentHandlers,
  createCollaborationNoteHandlers,
  parentEntityResource,
  type EntityAttachmentLink,
  type EntityAttachmentLinkRepository,
  type EntityNote,
  type EntityNoteRepository,
} from "./index.js";

const clock: Clock = { now: () => new Date("2026-07-18T12:00:00.000Z") };

const passthroughUnitOfWork: UnitOfWork = {
  execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    return work(passthroughUnitOfWork);
  },
};

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
      issuedAt: new Date("2026-07-18T12:00:00.000Z"),
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
      correlationId: CorrelationId.from(
        "00000000-0000-4000-8000-000000000002",
      ),
      causationId: null,
      companyId: (payload as { companyId: string }).companyId,
      actorId: "user-1",
      issuedAt: new Date("2026-07-18T12:00:00.000Z"),
    },
  };
}

function ctx(companyId = "co-1"): ApplicationContext {
  return {
    correlationId: "corr-1",
    userId: "user-1",
    companyId,
    branchId: null,
    principal: null,
    metadata: {},
    clock,
    signal: null,
    policyEngine: { evaluate: async () => ({ allowed: true }) },
    workflow: null,
    approval: null,
    rules: null,
    unitOfWork: passthroughUnitOfWork,
    outboxDispatcher: null,
  };
}

function createInMemoryNoteRepository(): EntityNoteRepository {
  const store = new Map<string, EntityNote>();
  const key = (companyId: string, id: string) => `${companyId}:${id}`;

  return {
    findById: async ({ companyId, id }) => ok(store.get(key(companyId, id)) ?? null),
    save: async (note) => {
      store.set(key(note.companyId, note.id), note);
      return ok(undefined);
    },
    remove: async ({ companyId, id }) => {
      store.delete(key(companyId, id));
      return ok(undefined);
    },
    listByEntity: async (companyId, entityType, entityId) =>
      ok(
        [...store.values()].filter(
          (n) =>
            n.companyId === companyId &&
            n.entityType === entityType &&
            n.entityId === entityId,
        ),
      ),
  };
}

function createInMemoryAttachmentLinkRepository(): EntityAttachmentLinkRepository {
  const store = new Map<string, EntityAttachmentLink>();
  const key = (companyId: string, id: string) => `${companyId}:${id}`;

  return {
    findById: async ({ companyId, id }) => ok(store.get(key(companyId, id)) ?? null),
    save: async (link) => {
      store.set(key(link.companyId, link.id), link);
      return ok(undefined);
    },
    remove: async ({ companyId, id }) => {
      store.delete(key(companyId, id));
      return ok(undefined);
    },
    listByEntity: async (companyId, entityType, entityId) =>
      ok(
        [...store.values()].filter(
          (l) =>
            l.companyId === companyId &&
            l.entityType === entityType &&
            l.entityId === entityId,
        ),
      ),
  };
}

const binding = {
  parentResourceType: "inventory_item",
  parentReadAction: "inventory.items.read",
  parentUpdateAction: "inventory.items.update",
} as const;

describe("RC7.4 collaboration note handlers", () => {
  it("rejects create when entityType does not match binding", async () => {
    const notes = createInMemoryNoteRepository();
    const handlers = createCollaborationNoteHandlers({
      notes,
      binding,
      allowedEntityType: "inventory.item",
    });

    const result = await handlers.create.handle(
      commandOf(CollaborationCommandTypes.CreateEntityNote, {
        companyId: "co-1",
        entityType: "crm.lead",
        entityId: "item-1",
        body: "hello",
      }),
      ctx(),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "entity_type_mismatch");
  });

  it("lists notes for an entity", async () => {
    const notes = createInMemoryNoteRepository();
    const handlers = createCollaborationNoteHandlers({
      notes,
      binding,
      allowedEntityType: "inventory.item",
    });

    const created = await handlers.create.handle(
      commandOf(CollaborationCommandTypes.CreateEntityNote, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-1",
        body: "first note",
      }),
      ctx(),
    );
    assert.equal(created.ok, true);

    const listed = await handlers.list.handle(
      queryOf(CollaborationQueryTypes.ListEntityNotes, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-1",
      }),
      ctx(),
    );

    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.notes.length, 1);
    assert.equal(listed.value.notes[0]?.body, "first note");
  });
});

describe("RC7.4 collaboration attachment handlers", () => {
  it("attach creates a link referencing assetId", async () => {
    const attachmentLinks = createInMemoryAttachmentLinkRepository();
    const handlers = createCollaborationAttachmentHandlers({
      attachmentLinks,
      binding,
      allowedEntityType: "inventory.item",
    });

    const attached = await handlers.attach.handle(
      commandOf(CollaborationCommandTypes.AttachEntityAsset, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-1",
        assetId: "asset-99",
        purpose: "spec-sheet",
      }),
      ctx(),
    );

    assert.equal(attached.ok, true);
    if (!attached.ok) return;

    const listed = await handlers.list.handle(
      queryOf(CollaborationQueryTypes.ListEntityAttachments, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-1",
      }),
      ctx(),
    );

    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.attachments.length, 1);
    assert.equal(listed.value.attachments[0]?.assetId, "asset-99");
  });
});

describe("RC7.4 parentEntityResource policy helper", () => {
  it("authorizes against the parent resource id and action", () => {
    const spec = parentEntityResource(
      "inventory_item",
      "inventory.items.update",
      "co-1",
      "item-42",
    );

    assert.deepEqual(spec, {
      action: "inventory.items.update",
      resource: {
        type: "inventory_item",
        id: "item-42",
        companyId: "co-1",
        ownerUserId: null,
        organizationId: null,
        branchId: null,
      },
    });
  });

  it("note create handler authorize targets parent entity", () => {
    const handlers = createCollaborationNoteHandlers({
      notes: createInMemoryNoteRepository(),
      binding,
      allowedEntityType: "inventory.item",
    });

    const spec = handlers.create.authorize?.(
      commandOf(CollaborationCommandTypes.CreateEntityNote, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-7",
        body: "x",
      }),
      ctx(),
    );

    assert.deepEqual(spec, {
      action: "inventory.items.update",
      resource: {
        type: "inventory_item",
        id: "item-7",
        companyId: "co-1",
        ownerUserId: null,
        organizationId: null,
        branchId: null,
      },
    });
  });
});

describe("RC7.4 optional audit hook", () => {
  it("records audit on successful note create when audit service provided", async () => {
    const auditCalls: Array<Record<string, unknown>> = [];
    const audit = {
      record: async (input: {
        readonly companyId: string | null;
        readonly actorUserId: string | null;
        readonly action: string;
        readonly entityType: string;
        readonly entityId?: string | null;
        readonly outcome: "success" | "failure";
        readonly details?: Readonly<Record<string, unknown>>;
        readonly correlationId?: string | null;
      }) => {
        auditCalls.push(input as Record<string, unknown>);
      },
    } as SecurityAuditService;

    const handlers = createCollaborationNoteHandlers({
      notes: createInMemoryNoteRepository(),
      audit,
      binding,
      allowedEntityType: "inventory.item",
    });

    await handlers.create.handle(
      commandOf(CollaborationCommandTypes.CreateEntityNote, {
        companyId: "co-1",
        entityType: "inventory.item",
        entityId: "item-1",
        body: "audited",
      }),
      ctx(),
    );

    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0]?.action, CollaborationCommandTypes.CreateEntityNote);
  });
});
