/**
 * Platform-wide reusable constants — no business constants.
 */

export const PLATFORM = {
  NAME: "artisan-furnish-hub",
  SHARED_KERNEL_PACKAGE: "@afh/shared-kernel",
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  UTC_TIME_ZONE: "UTC",
} as const;

export const TELEMETRY_CONTEXT_KEYS = {
  CORRELATION_ID: "correlation_id",
  CAUSATION_ID: "causation_id",
  COMPANY_ID: "company_id",
  EVENT_ID: "event_id",
  COMMAND_ID: "command_id",
  SAGA_ID: "saga_id",
} as const;

export const RESULT_KINDS = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const;
