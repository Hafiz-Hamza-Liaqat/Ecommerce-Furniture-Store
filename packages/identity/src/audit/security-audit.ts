/**
 * Security audit integration — append-only records (Phase 0E).
 * No reporting dashboards.
 */

import type { Clock } from "@afh/shared-kernel";

export type SecurityAuditRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly actorUserId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly outcome: "success" | "failure";
  readonly details: Readonly<Record<string, unknown>>;
  readonly correlationId: string | null;
  readonly createdAt: string;
};

export interface SecurityAuditStore {
  append(record: SecurityAuditRecord): Promise<void>;
}

export class InMemorySecurityAuditStore implements SecurityAuditStore {
  readonly records: SecurityAuditRecord[] = [];

  async append(record: SecurityAuditRecord): Promise<void> {
    this.records.push(record);
  }
}

export class SecurityAuditService {
  private readonly recent: SecurityAuditRecord[] = [];
  private readonly recentLimit = 64;

  constructor(
    private readonly store: SecurityAuditStore,
    private readonly clock: Clock,
  ) {}

  async record(input: {
    readonly companyId: string | null;
    readonly actorUserId: string | null;
    readonly action: string;
    readonly entityType: string;
    readonly entityId?: string | null;
    readonly outcome: "success" | "failure";
    readonly details?: Readonly<Record<string, unknown>>;
    readonly correlationId?: string | null;
  }): Promise<void> {
    const record: SecurityAuditRecord = {
      id: `audit_${this.clock.now().getTime()}_${Math.random().toString(36).slice(2, 10)}`,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      outcome: input.outcome,
      details: input.details ?? {},
      correlationId: input.correlationId ?? null,
      createdAt: this.clock.now().toISOString(),
    };
    await this.store.append(record);
    this.recent.push(record);
    if (this.recent.length > this.recentLimit) {
      this.recent.shift();
    }
  }

  /**
   * RC5.9 — process-local ring buffer of the most recent audit records for
   * harden/diagnostics. Not a durable query API; does not replace store reads.
   */
  recentRecords(): readonly SecurityAuditRecord[] {
    return this.recent.slice();
  }
}
