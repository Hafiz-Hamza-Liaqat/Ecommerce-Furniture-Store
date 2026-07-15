# @afh/dam

Enterprise **Document & Digital Asset Foundation** (Phase 3E).

Canonical DAM models for Commerce, Inventory, Finance, Projects, CRM, Manufacturing, Procurement, Reporting, and AI — without storage providers, upload pipelines, or media processing.

Depends on: `@afh/shared-kernel`

## What this package provides

| Area | Contents |
|------|----------|
| Digital Asset | Asset, type, status, classification, visibility |
| Version | Immutable version + metadata (opaque `storageRef`) |
| Folder / Collection | Hierarchy and grouping |
| Metadata | Keys, values, tags, labels |
| Document | Document abstractions linked to assets |
| Attachment | Entity/owner linking contracts |
| Derivative | Thumbnail / preview / optimized / original refs (inherit visibility) |
| Events | Event **contracts** only |
| Repositories | **Interfaces only** |
| Validation | Structural validators only |
| Composition | `createDamFoundation()` |

## Architecture note

**DAM remains the sole owner of digital assets.** Other domains hold asset ids / attachment links only.

## Usage

```ts
import { createDamFoundation } from "@afh/dam";

const dam = createDamFoundation();
```

## Out of scope

Uploads, object storage, CDN, image/video processing, OCR, PDF generation, search indexing, Event Bus, HTTP/UI, SQL/ORM/migrations.
