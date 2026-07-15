# Deployment

Container-friendly process start. No Kubernetes-specific manifests in this phase.

## Build

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run verify -w @afh/runtime-host
```

## Package

CI uploads `artifacts/afh-runtime-host.tgz` (and related package tarballs). Unpack onto the target host with matching `node_modules` from the same lockfile, or run from the monorepo workspace.

## Start contract

| Signal | Behavior |
|--------|----------|
| Process start | Load config → secrets → SQL → broker → API → validate → listen |
| Readiness | Health registry not `down` (`lifecycle.isReady()`) |
| Liveness | Process started (`lifecycle.isLive()`) |
| Stop | Graceful shutdown on SIGTERM/SIGINT |

Environment profiles: `development` | `testing` | `staging` | `production`. Profile selects defaults only — no business logic branches.
