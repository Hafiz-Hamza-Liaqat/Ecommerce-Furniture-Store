# RC7.2f — Projects List Implementation Report

- **Date:** 2026-07-18
- **Slice:** Projects List* (`ListProject`, `ListTask`, `ListMilestone`)
- **Depends on:** RC7.2d (`6e8f48b`), RC7.1 (`1fb1a26`), ADR D56
- **Status:** Implementation complete — **awaiting review; not committed**

## Delivered

- Three List* handlers via unmodified `buildAuthorizedListPage` + `principalListScope`
- `TaskRepository.listByCompany` + `MilestoneRepository.listByCompany` — RC7.1 contract completions only
- Resource/Schedule/WorkItem List* deferred (not required for freeze minimum; Resource optional later)
- 47 tests (15×3 + Get/lifecycle regression)

## Suggested commit message (do not commit until approved)

```
feat(rc7.2f): add Projects List* queries using shared authorized list foundation
```
