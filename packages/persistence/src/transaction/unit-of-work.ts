/**
 * Canonical Unit of Work implementation (Phase 1A contract).
 */

import {
  fail,
  isFail,
  ok,
  InfrastructureError,
  type PlatformError,
  type Result,
  type UnitOfWork,
} from "@afh/shared-kernel";
import type { DatabaseClient, DatabaseTransaction } from "../database/database.js";
import type { TransactionContext } from "./transaction-context.js";

export class UnitOfWorkImpl implements UnitOfWork {
  constructor(
    private readonly client: DatabaseClient,
    private readonly context: TransactionContext,
  ) {}

  getCurrentTransaction(): DatabaseTransaction | null {
    return this.context.getCurrent();
  }

  async execute<T>(
    work: (uow: UnitOfWork) => Promise<Result<T, PlatformError>>,
  ): Promise<Result<T, PlatformError>> {
    if (this.context.getCurrent() !== null) {
      return work(this);
    }

    const begin = await this.client.beginTransaction();
    if (isFail(begin)) {
      return begin;
    }

    const tx = begin.value;

    try {
      const result = await this.context.run(tx, async () => work(this));

      if (isFail(result)) {
        const rolled = await tx.rollback();
        if (isFail(rolled)) {
          return rolled;
        }
        return result;
      }

      const committed = await tx.commit();
      if (isFail(committed)) {
        return committed;
      }

      return ok(result.value);
    } catch (cause) {
      await tx.rollback();
      return fail(
        new InfrastructureError("Unit of work failed", {
          code: "unit_of_work_failed",
          cause,
        }),
      );
    }
  }
}
