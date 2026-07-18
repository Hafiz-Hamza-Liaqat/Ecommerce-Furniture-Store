# RC7.0 Planning Report

- **Version:** 1.0
- **Created:** 2026-07-18
- **Last Updated:** 2026-07-18
- **Slice:** RC7.0 — V1 Product Freeze & Planning
- **Type:** Documentation only
- **Approval:** RC7.0 documentation review — APPROVED

## Delivered

| Artifact | Path |
|---|---|
| RC7 index | `docs/rc7/README.md` |
| Overview | `docs/rc7/01-Overview.md` |
| Implementation plan | `docs/rc7/02-Implementation-Plan.md` |
| **V1 scope freeze** | `docs/rc7/03-V1-Scope-Freeze.md` |
| Acceptance criteria | `docs/rc7/04-Acceptance-Criteria.md` |
| Slice roadmap | `docs/rc7/05-Slice-Roadmap.md` |
| Planning audit | `docs/release/RC7.0-planning-audit.md` |

## Canonical alignment

| Source | How used |
|---|---|
| Roadmap §RC7 (6 scope items) | Mapped to objectives, slices RC7.1–RC7.8+, acceptance |
| RC5 deferrals (List\*, fixtures) | RC7.1–RC7.3 |
| RC6 complete / D49–D55 | Ownership freeze; no engine rework |
| ADR D46 | Totals after Policy filter in RC7.1 + acceptance |
| Feature-gap / RC2 matrices | Wired CQRS entities = List\* Included; unfinished modules = RC7.8+ subsets |
| Manufacturing phase-4e | Domain-only; MES deferred to RC12 |

## Slice map (frozen plan)

RC7.0 → RC7.1 → RC7.2a–g → RC7.3 → RC7.4; RC7.5 → RC7.6 → RC7.7 → RC7.8+ (Manufacturing/HR/CMS/Notifications/Reporting/Search V1 subsets) → final packet.

## Explicit non-delivery

No handlers, APIs, migrations, UI, tests, or runtime behavior changes in RC7.0.

## Next step (human)

1. Review and approve V1 freeze (`03-V1-Scope-Freeze.md`).
2. Commit RC7.0 docs when approved (suggested message below).
3. **Do not** start RC7.1 until explicit approval.

## Documentation refinements (post-review)

Non-blocking review feedback applied before commit:

1. V1 freeze states it is the **single source of truth**; no Included expansion without amendment.
2. README **Definition of Done**.
3. RC7.1 explicitly delivers **no** module/entity handlers.
4. Optimistic concurrency: fail closed, never silent overwrite.
5. Reporting/Search: **read model only; never a business owner**.
6. RC7.8 and later: planning review if freeze changes.
7. Acceptance **R8**: no Production profile browser-local persistence for Included entities.
8. Terminology normalized (`List*`, Policy row filtering, Production / Demo/Test profile, V1 freeze).

## Suggested commit message

```
docs(rc7.0): freeze V1 scope and RC7 planning pack

Add docs/rc7 overview, implementation plan, V1 Included/Excluded
freeze, acceptance criteria, and slice roadmap. Documentation only;
no RC7 engineering.
```