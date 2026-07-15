# @afh/platform

Enterprise **Workflow, Approval, Policy & Rules Foundation** (Phase 2B).

Depends on: `@afh/shared-kernel`, `@afh/persistence`, `@afh/identity`

## Engines

| Engine | Role |
|--------|------|
| **WorkflowEngine** | Lifecycle SSoT — definitions, instances, transitions, guards, assignments, SLA timeouts, history |
| **ApprovalEngine** | Human decisions — submit/claim/decide/delegate/escalate hooks, history |
| **RulesEngine** | Generic rule set evaluation (no pricing/business formulas) |
| **EnhancedPolicyEngine** | Deepens Phase 2A Policy — enrichers + ABAC attribute predicates; **not** a second authz engine |

## Usage

```ts
import { createIdentityFoundation } from "@afh/identity";
import { createPlatformEngines } from "@afh/platform";

const identity = createIdentityFoundation();
const platform = createPlatformEngines({ identity });
```

## Out of scope

Event Bus / publishers / consumers, Commerce, Inventory, Sales, HTTP/UI, business approval flows, pricing rules.
