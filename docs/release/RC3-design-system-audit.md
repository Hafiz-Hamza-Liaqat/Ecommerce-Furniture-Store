# RC3 — Design System Audit

## Token layer

- `tokens.css` — brand colors, fonts, radius, focus ring (unchanged base)
- `enterprise-tokens.css` — spacing, elevation, motion, touch, table row height

## Component inventory

| Component | Location | RC3 status |
|-----------|----------|------------|
| Button | `components/ui.tsx` | Consistent variants; touch min-height on coarse |
| TextField | `components/ui.tsx` | Required indicator, validation `role="alert"` |
| Alert | `components/ui.tsx` | `role="alert"` on danger tone |
| PageHeader | `components/ui.tsx` | Enterprise header spacing via CSS |
| EmptyState | `components/ui.tsx` + `widgets.tsx` | Shared panel / ws-empty patterns |
| EnterpriseError | `components/EnterpriseError.tsx` | **New** — unified error system |
| RouteFallback | `components/EnterpriseError.tsx` | **New** — route Suspense skeleton |
| StatusBadge, Tabs, Skeleton | `workspace/widgets.tsx` | Reused; ErrorState delegates to EnterpriseError |
| Tables | `workspace.css` + `enterprise.css` | Sticky header, hover, wrap border |
| Cards / KPIs | `workspace.css` + `enterprise.css` | Subtle hover elevation |
| Toasts / modals / drawers | `workspace.css` | Motion tokens; reduced-motion safe |

## Stylesheet load order (`main.tsx`)

1. `enterprise-tokens.css`
2. `global.css` → `tokens.css`
3. `components.css`
4. `workspace.css`
5. **`enterprise.css`** (RC3 polish layer)
6. Module-specific CSS (modules, productivity, analytics, ai, integrations, platform, marketing)

## Duplicates removed / consolidated

- Error UI consolidated from ad-hoc `ws-empty--error` blocks → `EnterpriseError`
- Marketing 404 → `EnterpriseError kind="not-found"`

## Verdict

**Pass** — one token stack, one error system, shared primitives unchanged in API.
