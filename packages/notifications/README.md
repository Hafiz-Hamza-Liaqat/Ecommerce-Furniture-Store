# @afh/notifications

Enterprise **Notification Foundation** (Phase 3F).

Transport-independent notification contracts. Per Phase 0A, domains emit events; notification handlers (later) consume via the Event Bus and render with Settings templates.

Depends on: `@afh/shared-kernel`

## Usage

```ts
import { createNotificationFoundation } from "@afh/notifications";

const notifications = createNotificationFoundation();
```

## Out of scope

Email/SMS/push/WhatsApp providers, WebSockets, delivery workers, Event Bus, HTTP/UI.
