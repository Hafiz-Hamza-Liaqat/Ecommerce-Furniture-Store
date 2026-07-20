# RC9.4 Test Summary

**Date:** 2026-07-20  
**Package:** `@afh/web` (`packages/web`)

## New tests

`packages/web/src/marketing/cx/rc94-projects.test.ts`

| Area | Cases |
|---|---|
| Persistence | Create project, list/search |
| Resume | `restorePlannerFromRoom` |
| Versions | Snapshot on save, restore, compare diff |
| Multi-room | `addRoom`, `duplicateRoom` |
| AI integration | `syncConsultantState`, `welcomeBackMessage` |
| Quotes + CRM | `recordQuote`, `buildCrmProjectMeta` |
| Collaboration | Share link, `inviteCollaborator`, `canAccessProject` |
| Login merge | `mergeProjectsOnLogin` |
| Notes | `addProjectNote` |

## Regression suites (must pass)

- RC9.1 CX tests (`cx.test.ts`)
- RC9.2 consultant (`rc92-consultant.test.ts`)
- RC9.3 planner, handoff, precommit (`rc93-*.test.ts`)

## Gates

| Gate | Result |
|---|---|
| Lint | Pass |
| Typecheck | Pass |
| Unit tests | **134 passed** (21 files, incl. `rc94-projects.test.ts`) |
| Build | Pass |
| RC9.1–RC9.3 regression | Pass |

Run from `packages/web`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Manual verification checklist

- [ ] Create project from planner → Save project → refresh → state restored
- [ ] Open `/my-projects` → project listed with correct status/budget
- [ ] Search/filter/sort dashboard
- [ ] Add room + duplicate room → switch tabs → each room retains state
- [ ] Continue in AI Consultant → conversation continues with welcome-back
- [ ] Reopen consultant via `?projectId=` → messages restored
- [ ] Convert to quotation → status becomes Quoted; CRM meta includes projectId
- [ ] Share link copies → open in new session → shared banner appears
- [ ] Logout/login as user → guest projects merge to account
- [ ] PDF export, quote page, product links still work
- [ ] Keyboard focus on dashboard filters and room tabs
- [ ] Reduced motion: no new animations added
