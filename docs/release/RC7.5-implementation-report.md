# RC7.5 Implementation Report

- **Date:** 2026-07-18
- **Slice:** RC7.5 — DAM foundation
- **Baseline:** RC7.4 committed (`85ef278`)
- **Verdict:** Implementation complete — **awaiting human review (not committed)**
- **Paired with:** RC7.6 (same working tree; separate reports)

## Summary

Delivered production binary/object storage (filesystem adapter + opaque `storageRef`), Create/Get/List Asset CQRS with Policy + company isolation, MIME/size enforcement, and upload-router byte persistence. No CDN/S3 invention.

## Delivered

| Capability | Detail |
|---|---|
| `ObjectStore` contract | `@afh/dam` — put/get/exists |
| Filesystem adapter | `{dataDir}/dam-objects/{companyId}/{assetId}/{versionId}.bin`, ref `fs:…` |
| `@afh/dam-application` | `dam.CreateAsset`, `dam.GetAsset`, `dam.ListAsset` |
| ListAsset | Uses unmodified `buildAuthorizedListPage` + `principalListScope` |
| Permissions | `dam.assets.create`, `dam.assets.read` (+ existing upload API permission) |
| Upload router | Persists `rawBody` → ObjectStore + AssetVersion; MIME/size enforced |
| Runtime wiring | Object store under database directory; versions + store in enterprise repos |

## Explicitly deferred

| Item | Note |
|---|---|
| Folders / collections / derivatives / renditions | Out of freeze Included |
| Cloud object providers | Future; `storageRef` remains opaque |
| Module attachment UX | RC7.6 / UI later |

## Architecture

- RC7.1 / Policy / Workflow / Approval — **unchanged**
- No new SQL migrations (bytes on filesystem; metadata in `aggregate_documents`)
- No UI redesign
