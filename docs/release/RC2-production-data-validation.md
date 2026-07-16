# RC2 — Production Data Validation Report

## Validated with live contracts

- Module dashboards: `Get*Summary` for Procurement, Inventory, Finance, CRM, Projects, Service
- Entity Get* on detail when `getQueryType` + companyId present; successful results cached into local module store as `source: "api"`
- Create/Update commands for wired entities require company-scoped session
- Forbidden responses surface Policy ownership message (UI never authorizes)
- Session refresh rotates tokens before expiry; failure clears session
- DAM create uses upload API
- Executive dashboard live summary strip probes the six registered summaries

## Not production data (documented inventory)

- ERP **list** grids (no List handlers)
- Manufacturing / HR / CMS / Notifications / Reporting / Search modules
- Platform billing/tenants/portal aggregates
- Integration marketplace connection drafts
- AI prefs, BI builder prefs, shell favorites/layout
- Approvals/Workflow operator seeds (engines not CQRS-exposed)
- Sales company-wide KPI strip (only `GetCustomerSalesSummary` exists)

No fabricated metrics were invented where handlers are absent.
