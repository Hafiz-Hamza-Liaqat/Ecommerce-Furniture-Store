/**
 * Inbox runtime — consumer deduplication / idempotency.
 * No business handlers.
 */

import type { Clock, PlatformError, Result } from "@afh/shared-kernel";
import { ConflictError, fail, ok } from "@afh/shared-kernel";
import type { InboxStore } from "@afh/persistence";

export type InboxClaimResult =
  | { readonly kind: "duplicate" }
  | { readonly kind: "claimed" };

/**
 * Guarantees at-most-once business processing via inbox marking.
 * Call claim before handler; if duplicate, skip work.
 */
export class InboxRuntime {
  readonly #store: InboxStore;
  readonly #clock: Clock;

  constructor(store: InboxStore, clock: Clock) {
    this.#store = store;
    this.#clock = clock;
  }

  async hasProcessed(
    consumerName: string,
    eventId: string,
  ): Promise<Result<boolean, PlatformError>> {
    return this.#store.hasProcessed(consumerName, eventId);
  }

  async claim(
    consumerName: string,
    eventId: string,
  ): Promise<Result<InboxClaimResult, PlatformError>> {
    const existing = await this.#store.hasProcessed(consumerName, eventId);
    if (!existing.ok) return existing;
    if (existing.value) {
      return ok({ kind: "duplicate" });
    }

    const marked = await this.#store.markProcessed({
      consumerName,
      eventId,
      processedAt: this.#clock.now().toISOString(),
    });

    if (!marked.ok) {
      if (marked.error instanceof ConflictError) {
        return ok({ kind: "duplicate" });
      }
      return marked;
    }

    return ok({ kind: "claimed" });
  }

  async rejectDuplicate(
    consumerName: string,
    eventId: string,
  ): Promise<Result<void, PlatformError>> {
    const result = await this.claim(consumerName, eventId);
    if (!result.ok) return result;
    if (result.value.kind === "duplicate") {
      return fail(
        new ConflictError("Message already processed", {
          code: "inbox_duplicate",
          details: { consumerName, eventId },
        }),
      );
    }
    return ok(undefined);
  }
}
