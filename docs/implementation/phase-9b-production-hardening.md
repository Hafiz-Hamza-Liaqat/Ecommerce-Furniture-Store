# Phase 9B — Enterprise Production Hardening

**Status:** Implemented  
**Package:** `@afh/runtime-host` (+ additive SQL integrity helpers in `@afh/persistence-sql`)  
**Depends on:** Phase 9A, Phase 9A.1 audit (PASS WITH NOTES)  
**Architecture:** Phases 0A–0F **unchanged**

## Summary

Production hardening only: resilience policies, broker operational helpers, SQL integrity/busy-timeout verification, backup/restore validation, DR readiness checks, load-test foundation, resilience scenarios, monitoring verification, diagnostics, security operational validation, CI hardening, and production acceptance suite.

**No business features. No architecture redesign. No schema redesign. No cloud/K8s.**

## Scope delivered

| Area | Implementation |
|------|----------------|
| Runtime resilience | `hardening/resilience.ts` + shutdown timeout in lifecycle |
| Broker hardening | `hardening/broker-hardening.ts` (DLQ inspect, replay safety, poison decide, concurrency summary) |
| Database hardening | config knobs + `integrityCheck` / `sql_integrity` probe + startup schema verify |
| Backup / restore | `hardening/backup-restore.ts` + ops runbook |
| Disaster recovery | `hardening/disaster-recovery.ts` + ops runbook |
| Load foundation | `hardening/load-foundation.ts` |
| Resilience tests | `hardening/resilience-scenarios.ts` + `bin/harden.ts` |
| Monitoring verification | `hardening/monitoring-verification.ts` |
| Diagnostics | `hardening/diagnostics.ts` (no secrets) |
| Security validation | `hardening/security-validation.ts` (rotation/session/MFA/audit probes) |
| CI/CD hardening | `.github/workflows/ci.yml` — deps, harden, accept, artifact integrity |
| Production acceptance | `hardening/production-acceptance.ts` + `bin/accept.ts` |

## Commands

```bash
npm run verify -w @afh/runtime-host
npm run harden -w @afh/runtime-host
npm run accept -w @afh/runtime-host
npm test -w @afh/runtime-host
```

## Architecture compliance

| Law | Status |
|-----|--------|
| Outbox sole business publish | **PASS** |
| Policy sole authz | **PASS** |
| Workflow lifecycle SSoT | **PASS** |
| Architecture pack frozen | **PASS** |
| 9A.1 notes preserved (deferred coverage) | **PASS** |

## Explicit non-goals

Business modules, Event Bus/SQL/Auth redesign, cloud deploy, vendor APM, multi-region DR.
