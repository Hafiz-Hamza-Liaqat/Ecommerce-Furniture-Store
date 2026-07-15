/**
 * Handler contracts — no domain handlers in this package.
 */

import type { Command, Query, PlatformError, Result } from "@afh/shared-kernel";
import type { PolicyResource } from "@afh/identity";
import type { Validator } from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";

export type AuthorizationSpec = {
  readonly action: string;
  readonly resource: PolicyResource;
};

export interface CommandHandler<
  TPayload = Readonly<Record<string, unknown>>,
  TResult = unknown,
> {
  readonly commandType: string;
  authorize?(
    command: Command<TPayload>,
    ctx: ApplicationContext,
  ): AuthorizationSpec | Promise<AuthorizationSpec>;
  validate?(
    command: Command<TPayload>,
    ctx: ApplicationContext,
  ): Validator<Command<TPayload>> | null;
  handle(
    command: Command<TPayload>,
    ctx: ApplicationContext,
  ): Promise<Result<TResult, PlatformError>>;
}

export interface QueryHandler<
  TPayload = Readonly<Record<string, unknown>>,
  TResult = unknown,
> {
  readonly queryType: string;
  authorize?(
    query: Query<TPayload>,
    ctx: ApplicationContext,
  ): AuthorizationSpec | Promise<AuthorizationSpec>;
  validate?(
    query: Query<TPayload>,
    ctx: ApplicationContext,
  ): Validator<Query<TPayload>> | null;
  handle(
    query: Query<TPayload>,
    ctx: ApplicationContext,
  ): Promise<Result<TResult, PlatformError>>;
}

export class HandlerRegistry {
  readonly #commands = new Map<string, CommandHandler>();
  readonly #queries = new Map<string, QueryHandler>();

  registerCommand(handler: CommandHandler): void {
    this.#commands.set(handler.commandType, handler);
  }

  registerQuery(handler: QueryHandler): void {
    this.#queries.set(handler.queryType, handler);
  }

  resolveCommand(commandType: string): CommandHandler | null {
    return this.#commands.get(commandType) ?? null;
  }

  resolveQuery(queryType: string): QueryHandler | null {
    return this.#queries.get(queryType) ?? null;
  }

  listCommandTypes(): readonly string[] {
    return [...this.#commands.keys()];
  }

  listQueryTypes(): readonly string[] {
    return [...this.#queries.keys()];
  }
}
