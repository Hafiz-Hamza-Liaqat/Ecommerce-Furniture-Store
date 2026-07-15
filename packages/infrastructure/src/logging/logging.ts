/**
 * Structured logger — redacts secret-like keys. No vendor SDK.
 */

import type { LogContext, LogLevel, Logger } from "@afh/shared-kernel";

const REDACT_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "authorization",
  "credential",
]);

function redact(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = REDACT_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return out;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

export class ConsoleLogger implements Logger {
  readonly #minLevel: LogLevel;
  readonly #base: LogContext;

  constructor(minLevel: LogLevel = "info", base: LogContext = {}) {
    this.#minLevel = minLevel;
    this.#base = base;
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(this.#minLevel, { ...this.#base, ...context });
  }

  debug(message: string, context?: LogContext): void {
    this.#write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.#write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.#write("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.#write("error", message, context);
  }

  fatal(message: string, context?: LogContext): void {
    this.#write("fatal", message, context);
  }

  #write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.#minLevel]) return;
    const payload = {
      level,
      message,
      ...this.#base,
      ...redact(context),
      ts: new Date().toISOString(),
    };
    const line = JSON.stringify(payload);
    if (level === "error" || level === "fatal") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
