# RC5 Navigation Audit

## 1. Summary

| Surface | Inventory | Destination result | Authorization result |
|---|---:|---|---|
| Application sidebar | 39 configured entries | 39 resolve; one duplicated destination | No permission filtering |
| Sidebar suggestions | 4 | All resolve | No permission filtering |
| Command palette | 40 static + 10 generated quick-create entries | All routes/actions resolve | No permission filtering |
| Context palette entries | 2 always + sales/project conditional entry | All resolve | No permission filtering |
| Quick-create launcher | 10 | All resolve to module landing pages | No entity/create permission filtering |
| Keyboard shortcuts | 8 | All overlay/state actions resolve | No permission filtering |
| Top-bar account menu links | 10 route links + local actions/logout | All resolve | No permission filtering |
| Breadcrumbs | Derived from URL segments | Base links generally resolve; dynamic segments are not validated | No permission filtering |
| Marketing header/footer | 8 primary actions, collection/category links, 20 footer page links, legal links | Internal destinations resolve; sitemap is static asset dependent | Public by design |

## 2. Application sidebar — complete configured destinations

| Group | Destinations | Exists | Duplicate/obsolete | Required authorization |
|---|---|---|---|---|
| Workspace | `/app`, `/app/me`, `/app/analytics`, `/app/reports`, `/app/insights`, `/app/ai`, `/app/integrations`, `/app/platform`, `/app/settings/ai`, `/app/calendar`, `/app/approvals`, `/app/notifications`, `/app/search`, `/app/workflow`, `/app/reporting`, `/app/preferences` | All | `/app/platform` duplicated below | Self routes auth-only; otherwise matching dashboard/feature view |
| Operations | `/app/sales`, `/app/procurement`, `/app/inventory`, `/app/finance`, `/app/projects`, `/app/crm`, `/app/service` | All | None | `{module}.dashboard.read` |
| People & plant | `/app/hr`, `/app/manufacturing` | All | None | module dashboard view |
| Platform | `/app/platform`, `/app/platform/billing`, `/app/platform/deployment`, `/app/platform/monitoring`, `/app/platform/audit`, `/app/cms`, `/app/dam`, `/onboarding`, `/admin/platform`, `/portal`, `/app/account/email-verification`, `/app/account/mfa`, `/app/account/security`, `/` | All | `/app/platform` duplicate; public/auth routes mixed into staff nav | Platform/CMS/DAM gates; self account; portal/admin role gates; public N/A |

The mobile navigation is the same `Sidebar` component behind a responsive drawer, so it has the same inventory and authorization gap rather than a separate menu catalog.

Dynamic favorites, recently visited pages, and bookmarks accept paths from local storage. They are not permission-filtered or revalidated against the route catalog before rendering.

## 3. Suggestions, cards, and recent links

| Source | Items | Destination result | Gap |
|---|---|---|---|
| Sidebar suggestions | Executive analytics, pending approvals, today's calendar, enterprise search | All exist | No view/approval permission filtering |
| Dashboard quick actions | New customer, quote, sales order, purchase request, inventory adjustment, project, task, employee, service request, upload | All module destinations exist | Links only to landing pages; labels imply create rights not checked |
| Recent records | Sales order, project, purchase order, service | All module destinations exist | Fixture links do not identify actual records |
| Saved views | Sales, inventory, approvals | All exist | Local fixtures; no permission filtering |
| Drafts | Sales quote, procurement request | All exist | Local fixtures; no record authorization |

Dashboard cards use `Link` targets and local fixture definitions. They do not check permissions and therefore must not be treated as evidence of access.

## 4. Command palette

### Navigation commands

The 38 route-oriented static commands resolve to: executive, workspace, analytics, reports, insights, AI, integrations, webhooks, platform, billing, onboarding, portal, SaaS admin, monitoring, audit, demo mode, register, account security, AI settings/search, analytics builder, calendar, preferences, 11 ERP/content modules, approvals, notifications, search, and reporting.

### Non-route commands

`#shortcuts` and `#create` are intentionally intercepted to open overlays; they are not missing routes. Ten generated create commands reuse the quick-action destinations listed above.

### Context commands

`/app/preferences` and `/app/calendar` are always added. Sales adds `/app/sales`; projects adds `/app/projects/pipeline`. All resolve.

**Authorization gap:** palette results are filtered by text/mode only. A user can discover and navigate to every sensitive route, including API keys, platform admin, billing, audit, AI settings, and analytics builder.

## 5. Breadcrumbs

- The top bar creates crumbs from raw `/app` path segments.
- Known first segments receive labels; unknown ones are displayed verbatim.
- Intermediate crumbs become links even when the intermediate URL has no distinct page.
- Account crumbs are special-cased and resolve.
- Breadcrumbs inherit the route guard but have no permission filtering.

No fixed obsolete breadcrumb was found. Dynamic breadcrumb validity is partial because record/entity labels are not loaded from authorized data.

## 6. Top-bar and shortcuts

| Item/action | Destination/behavior | Exists | Permission needed |
|---|---|---|---|
| Integrations | `/app/integrations` | Yes | integration view |
| SaaS operations | `/app/platform` | Yes | platform ops view |
| Customer portal | `/portal` | Yes | portal customer view + ownership |
| AI Assistant | `/app/ai` | Yes | `ai.assistant.use` |
| AI Settings | `/app/settings/ai` | Yes | `ai.settings.manage` |
| Security & devices | `/app/account/security` | Yes | self |
| Preferences | `/app/preferences` | Yes | self |
| Enterprise calendar | `/app/calendar` | Yes | authenticated staff |
| Security/MFA | `/app/account/mfa` | Yes | self |
| My workspace | `/app/me` | Yes | self |
| Create, AI panel, notifications, favorites, help, shortcuts | Local overlay/state | Yes | Action-specific filtering missing |
| Logout | API sign-out then local clear | Yes | Own session |

All eight declared keyboard shortcuts are wired to UI state/actions: command center, sidebar, notifications, quick create, preferences, AI panel, shortcuts, and close overlays. No shortcut bypasses backend Policy, but shortcuts expose UI features without route/action authorization.

## 7. Marketing navigation

The public header resolves collection/category filters to `/products`, static links to products/projects/manufacturing/about/contact/quote, and console to `/app`. The footer resolves company pages, capability pages, explore pages, privacy, and terms. Public navigation requires no RC5 permission. The newsletter, search, chat, and theme controls are local presentation features.

No obsolete public link was found in the configured header/footer set. `/sitemap.xml` is not a React route and must be verified as a deployed static asset.

## 8. Navigation verdict

**Destination integrity:** high; one intentional/accidental duplicate (`/app/platform`) and no missing configured internal destination.  
**Authorization integrity:** absent; every application navigation source is role/permission blind.
