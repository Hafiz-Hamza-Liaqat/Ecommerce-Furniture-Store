# RC2 — CRUD Verification Report

| Capability | Status |
|------------|--------|
| Create (wired entities) | Pass — `dispatchCommand` + idempotency key |
| Read (Get*) | Pass — detail page query + mapEntity |
| Update | Pass — `updateCommandType` + `buildUpdatePayload` on Sales opp, CRM lead, Procurement supplier, Inventory item, Finance account, Projects project, Service request |
| Delete | N/A — no Delete handlers exposed; Cancel/Archive/Close used instead |
| Pagination / search / sort / filters | Presentation ModuleApp (local list) — no List APIs |
| Validation | Backend ValidationError → ApiClientError |
| Optimistic concurrency / versions | Enforced server-side; UI does not invent tokens |
| Error handling | Correlation ID + Policy forbidden messaging |

### Lifecycle commands verified in UI bindings

- Sales: ReviseQuote, CancelSalesOrder (Approval/Workflow flags server-side)
- Procurement: SubmitPurchaseRequisition, IssuePurchaseOrder, CancelPurchaseOrder
- Inventory: ReceiveStock
- CRM: QualifyLead, ConvertLead
- Projects: ArchiveProject, CompleteTask
- Service: CloseServiceRequest
