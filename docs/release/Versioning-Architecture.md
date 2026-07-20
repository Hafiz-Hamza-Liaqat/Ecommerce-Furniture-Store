# Versioning Architecture (RC9.4)

## When versions are created

A `ProjectVersion` snapshot is appended when:

1. **Project created** — "Version 1 / Initial project"
2. **Planner save** — `upsertRoomSnapshot(..., summary)` e.g. "Budget increased"
3. **Status change** — `setProjectStatus`
4. **Room operations** — add, duplicate, rename, delete, reorder
5. **Notes** — `addProjectNote`
6. **Share link** — `createShareLink`
7. **Quotation** — `recordQuote`
8. **Version restore** — creates a new version documenting the restore

Consultant-only edits (`syncConsultantState`) update the project **without** a new version to avoid noise; planner saves and explicit actions create versions.

## Version shape

```ts
ProjectVersion {
  id, versionNumber, label, summary, createdAt
  rooms[]           // full room snapshots
  consultantMemory, consultantMessages
  status, notes[]
  totalBudgetPkr, totalPackagePkr
  diff?: ProjectVersionDiff
}
```

## Diff computation

`diffVersions(prev, next)` calculates:

| Field | Meaning |
|---|---|
| `budgetDeltaPkr` | Change in summed room budgets |
| `productsAdded` | Product ids in next not in prev |
| `productsRemoved` | Product ids in prev not in next |
| `roomChanges` | Room count changes |
| `aiSummary` | Optional summary from version label |

## API

| Function | Purpose |
|---|---|
| `persistProject(project, label?, summary?)` | Save with optional version |
| `restoreVersion(projectId, versionId)` | Restore rooms + consultant state; append restore version |
| `compareProjectVersions(projectId, aId, bId)` | Return `ProjectVersionDiff` |

## Retention

- Versions: last **50** per project
- Consultant messages in version: last **40**
- Notes: last **100**

## UI status (RC9.4)

Version history is fully implemented in the service layer and covered by unit tests. A dedicated version timeline panel in the planner/dashboard is deferred; users can rely on My Projects + resume flows for continuity.
