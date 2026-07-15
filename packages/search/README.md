# @afh/search

Enterprise **Search Foundation** (Phase 3F).

Infrastructure-neutral search contracts for indexing and query shapes. No Elasticsearch, OpenSearch, ranking, or query parser.

Depends on: `@afh/shared-kernel`

## Usage

```ts
import { createSearchFoundation } from "@afh/search";

const search = createSearchFoundation();
```

## Out of scope

Search engines, DB full-text, ranking, query parsers, HTTP/UI, Event Bus publishers.
