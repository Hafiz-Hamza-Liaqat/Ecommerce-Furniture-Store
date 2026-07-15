/**
 * Pipeline behaviors — reusable cross-cutting stages.
 * No business behaviors.
 */

import type {
  Command,
  Logger,
  Metrics,
  PlatformError,
  Query,
  Result,
  Tracer,
  UnitOfWork,
} from "@afh/shared-kernel";
import { CorrelationId, fail, toValidationResult } from "@afh/shared-kernel";
import type { PolicyEngine } from "@afh/identity";
import type { ApplicationContext } from "../context/context.js";
import type {
  AuthorizationSpec,
  CommandHandler,
  QueryHandler,
} from "../handlers/handlers.js";
import {
  authorizationDenied,
  mapThrownError,
  validationFailed,
} from "../errors/errors.js";

export type NextFn<TResult> = () => Promise<Result<TResult, PlatformError>>;

export type CommandPipelineContext<TPayload = Readonly<Record<string, unknown>>> =
  {
    readonly command: Command<TPayload>;
    readonly app: ApplicationContext;
    readonly handler: CommandHandler<TPayload>;
  };

export type QueryPipelineContext<TPayload = Readonly<Record<string, unknown>>> =
  {
    readonly query: Query<TPayload>;
    readonly app: ApplicationContext;
    readonly handler: QueryHandler<TPayload>;
  };

export interface CommandBehavior {
  execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>>;
}

export interface QueryBehavior {
  execute<TPayload, TResult>(
    ctx: QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>>;
}

export class ExceptionMappingBehavior
  implements CommandBehavior, QueryBehavior
{
  async execute<TPayload, TResult>(
    _ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    try {
      return await next();
    } catch (error) {
      return fail(mapThrownError(error));
    }
  }
}

export class LoggingBehavior implements CommandBehavior, QueryBehavior {
  constructor(private readonly logger: Logger) {}

  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    const kind = "command" in ctx ? "command" : "query";
    const type =
      "command" in ctx ? ctx.command.commandType : ctx.query.queryType;
    this.logger.info(`Executing ${kind}`, {
      type,
      correlationId: ctx.app.correlationId,
      companyId: ctx.app.companyId,
    });
    const result = await next();
    if (!result.ok) {
      this.logger.warn(`${kind} failed`, {
        type,
        code: result.error.code,
        correlationId: ctx.app.correlationId,
      });
    }
    return result;
  }
}

export class MetricsBehavior implements CommandBehavior, QueryBehavior {
  constructor(private readonly metrics: Metrics) {}

  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    const kind = "command" in ctx ? "command" : "query";
    const type =
      "command" in ctx ? ctx.command.commandType : ctx.query.queryType;
    const counter = this.metrics.counter(`app.${kind}.executed`);
    const failures = this.metrics.counter(`app.${kind}.failed`);
    const hist = this.metrics.histogram(`app.${kind}.duration_ms`);
    const started = Date.now();
    const result = await next();
    hist.record(Date.now() - started, { type });
    counter.add(1, { type });
    if (!result.ok) failures.add(1, { type });
    return result;
  }
}

export class TracingBehavior implements CommandBehavior, QueryBehavior {
  constructor(private readonly tracer: Tracer) {}

  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    const kind = "command" in ctx ? "command" : "query";
    const type =
      "command" in ctx ? ctx.command.commandType : ctx.query.queryType;
    return this.tracer.withSpan(
      `app.${kind}.${type}`,
      {
        correlationId: CorrelationId.from(ctx.app.correlationId),
        attributes: {
          kind,
          type,
          companyId: ctx.app.companyId ?? "",
        },
      },
      async (span) => {
        const result = await next();
        span.setAttribute("ok", result.ok);
        if (!result.ok) {
          span.recordException(result.error);
        }
        return result;
      },
    );
  }
}

export class ValidationBehavior implements CommandBehavior, QueryBehavior {
  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    if ("command" in ctx) {
      const validator = ctx.handler.validate?.(ctx.command, ctx.app) ?? null;
      if (validator) {
        const outcome = await validator.validate(ctx.command);
        const mapped = toValidationResult(outcome);
        if (!mapped.ok) return fail(mapped.error);
      }
    } else {
      const validator = ctx.handler.validate?.(ctx.query, ctx.app) ?? null;
      if (validator) {
        const outcome = await validator.validate(ctx.query);
        const mapped = toValidationResult(outcome);
        if (!mapped.ok) return fail(mapped.error);
      }
    }
    return next();
  }
}

/**
 * Policy is the sole runtime authorization engine.
 * Every command/query must obtain an AuthorizationSpec and be evaluated.
 */
export class AuthorizationBehavior implements CommandBehavior, QueryBehavior {
  constructor(private readonly policyEngine: PolicyEngine) {}

  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    if (!ctx.app.principal) {
      return fail(
        authorizationDenied("unauthenticated", "Principal is required"),
      );
    }

    let spec: AuthorizationSpec;
    if ("command" in ctx) {
      if (!ctx.handler.authorize) {
        return fail(
          validationFailed(
            `Command handler ${ctx.handler.commandType} missing authorize()`,
          ),
        );
      }
      spec = await ctx.handler.authorize(ctx.command, ctx.app);
    } else {
      if (!ctx.handler.authorize) {
        return fail(
          validationFailed(
            `Query handler ${ctx.handler.queryType} missing authorize()`,
          ),
        );
      }
      spec = await ctx.handler.authorize(ctx.query, ctx.app);
    }

    const decision = await this.policyEngine.evaluate(
      ctx.app.principal,
      spec.action,
      spec.resource,
      { correlationId: ctx.app.correlationId },
    );

    if (!decision.allowed) {
      return fail(
        authorizationDenied(decision.reasonCode, decision.message),
      );
    }

    return next();
  }
}

export class TransactionBehavior implements CommandBehavior {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute<TPayload, TResult>(
    _ctx: CommandPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    return this.unitOfWork.execute(async () => next());
  }
}

/**
 * After successful command: trigger outbox flush (sole publish path).
 * Never publishes domain events directly.
 */
export class OutboxFlushBehavior implements CommandBehavior {
  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    const result = await next();
    if (result.ok && ctx.app.outboxDispatcher) {
      const flush = await ctx.app.outboxDispatcher.dispatchOnce();
      if (!flush.ok) {
        return fail(flush.error);
      }
    }
    return result;
  }
}

export type AuditHook = (event: {
  readonly kind: "command" | "query";
  readonly type: string;
  readonly correlationId: string;
  readonly userId: string | null;
  readonly companyId: string | null;
  readonly ok: boolean;
  readonly errorCode: string | null;
}) => void | Promise<void>;

export class AuditBehavior implements CommandBehavior, QueryBehavior {
  constructor(private readonly hook: AuditHook) {}

  async execute<TPayload, TResult>(
    ctx: CommandPipelineContext<TPayload> | QueryPipelineContext<TPayload>,
    next: NextFn<TResult>,
  ): Promise<Result<TResult, PlatformError>> {
    const kind = "command" in ctx ? "command" : "query";
    const type =
      "command" in ctx ? ctx.command.commandType : ctx.query.queryType;
    const result = await next();
    await this.hook({
      kind,
      type,
      correlationId: ctx.app.correlationId,
      userId: ctx.app.userId,
      companyId: ctx.app.companyId,
      ok: result.ok,
      errorCode: result.ok ? null : result.error.code,
    });
    return result;
  }
}

export function runCommandPipeline<TPayload, TResult>(
  behaviors: readonly CommandBehavior[],
  ctx: CommandPipelineContext<TPayload>,
  terminal: NextFn<TResult>,
): Promise<Result<TResult, PlatformError>> {
  const chain = behaviors.reduceRight<NextFn<TResult>>(
    (next, behavior) => () => behavior.execute(ctx, next),
    terminal,
  );
  return chain();
}

export function runQueryPipeline<TPayload, TResult>(
  behaviors: readonly QueryBehavior[],
  ctx: QueryPipelineContext<TPayload>,
  terminal: NextFn<TResult>,
): Promise<Result<TResult, PlatformError>> {
  const chain = behaviors.reduceRight<NextFn<TResult>>(
    (next, behavior) => () => behavior.execute(ctx, next),
    terminal,
  );
  return chain();
}
