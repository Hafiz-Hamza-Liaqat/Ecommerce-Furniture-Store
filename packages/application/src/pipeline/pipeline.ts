/**
 * Command & Query pipelines.
 */

import type { Command, PlatformError, Query, Result } from "@afh/shared-kernel";
import { NotFoundError, fail } from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";
import type { HandlerRegistry } from "../handlers/handlers.js";
import {
  runCommandPipeline,
  runQueryPipeline,
  type CommandBehavior,
  type QueryBehavior,
} from "./behaviors.js";

export class CommandPipeline {
  constructor(
    private readonly registry: HandlerRegistry,
    private readonly behaviors: readonly CommandBehavior[],
  ) {}

  async execute<TPayload, TResult = unknown>(
    command: Command<TPayload>,
    app: ApplicationContext,
  ): Promise<Result<TResult, PlatformError>> {
    const handler = this.registry.resolveCommand(command.commandType);
    if (!handler) {
      return fail(
        new NotFoundError(`No command handler for ${command.commandType}`, {
          code: "command_handler_not_found",
          details: { commandType: command.commandType },
        }),
      );
    }

    const ctx = {
      command,
      app,
      handler: handler as never,
    };

    return runCommandPipeline(this.behaviors, ctx, () =>
      handler.handle(command as never, app),
    ) as Promise<Result<TResult, PlatformError>>;
  }
}

export class QueryPipeline {
  constructor(
    private readonly registry: HandlerRegistry,
    private readonly behaviors: readonly QueryBehavior[],
  ) {}

  async execute<TPayload, TResult = unknown>(
    query: Query<TPayload>,
    app: ApplicationContext,
  ): Promise<Result<TResult, PlatformError>> {
    const handler = this.registry.resolveQuery(query.queryType);
    if (!handler) {
      return fail(
        new NotFoundError(`No query handler for ${query.queryType}`, {
          code: "query_handler_not_found",
          details: { queryType: query.queryType },
        }),
      );
    }

    const ctx = {
      query,
      app,
      handler: handler as never,
    };

    return runQueryPipeline(this.behaviors, ctx, () =>
      handler.handle(query as never, app),
    ) as Promise<Result<TResult, PlatformError>>;
  }
}
