/**
 * @afh/persistence-sql — Enterprise SQL Persistence Adapters (Phase 7B)
 *
 * Production SQL implementations of PersistenceFoundation stores and domain
 * repository interfaces. Business packages remain interface-only.
 */

export * from "./config/config.js";
export * from "./database/sqlite-client.js";
export * from "./migrations/migrations.js";
export * from "./stores/aggregate-store.js";
export * from "./stores/event-store.js";
export * from "./stores/outbox-store.js";
export * from "./stores/inbox-store.js";
export * from "./mapping/document-repository.js";
export * from "./identity/sql-identity-store.js";
export * from "./identity/sql-audit-store.js";
export * from "./platform/index.js";
export * from "./repositories/index.js";
export * from "./composition/index.js";
export { createFilesystemObjectStore } from "./storage/filesystem-object-store.js";
