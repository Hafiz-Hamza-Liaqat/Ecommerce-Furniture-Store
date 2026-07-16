# RC5 CQRS Traceability Audit

**Count verified:** 64 commands + 43 queries = 107 registered contracts. Every handler object declares `authorize()`. Every current helper builds a company resource and sets `ownerUserId`, `organizationId`, and `branchId` to `null`.

## 1. Sales — 10

| Kind | Contract → current Policy action |
|---|---|
| Commands (6) | `CreateOpportunity` → `opportunity.create`; `UpdateOpportunity` → `opportunity.update`; `CreateQuote` → `quote.create`; `ReviseQuote` → `quote.revise`; `CreateSalesOrder` → `order.create`; `CancelSalesOrder` → `order.cancel` |
| Queries (4) | `GetOpportunity` → `opportunity.read`; `GetQuote` → `quote.read`; `GetSalesOrder` → `order.read`; `GetCustomerSalesSummary` → `order.read` |

## 2. Procurement — 11

| Kind | Contract → current Policy action |
|---|---|
| Commands (7) | `CreateSupplier` → `supplier.create`; `UpdateSupplier` → `supplier.update`; `CreatePurchaseRequisition` → `requisition.create`; `SubmitPurchaseRequisition` → `requisition.submit`; `CreatePurchaseOrder` → `po.create`; `IssuePurchaseOrder` → `po.issue`; `CancelPurchaseOrder` → `po.cancel` |
| Queries (4) | `GetSupplier` → `supplier.read`; `GetPurchaseRequisition` → `requisition.read`; `GetPurchaseOrder` → `po.read`; `GetProcurementSummary` → `po.read` |

## 3. Inventory — 17

| Kind | Contract → current Policy action |
|---|---|
| Commands (9) | `CreateInventoryItem` → `inventory.item.create`; `UpdateInventoryItem` → `inventory.item.update`; `CreateWarehouse` → `inventory.warehouse.create`; `CreateStorageLocation` → `inventory.location.create`; `ReceiveStock` → `inventory.stock.receive`; `AdjustStock` → `inventory.stock.adjust`; `ReserveStock` → `inventory.stock.reserve`; `ReleaseReservation` → `inventory.stock.release`; `TransferStock` → `inventory.stock.transfer` |
| Queries (8) | `GetInventoryItem` → `inventory.item.read`; `GetWarehouse` → `inventory.warehouse.read`; `GetStock` → `inventory.stock.read`; `GetStockLedger` → `inventory.ledger.read`; `GetBatch` → `inventory.batch.read`; `GetLot` → `inventory.lot.read`; `GetSerial` → `inventory.serial.read`; `GetInventorySummary` → `inventory.summary.read` |

## 4. Finance — 14

| Kind | Contract → current Policy action |
|---|---|
| Commands (8) | `CreateFinancialAccount` → `finance.account.create`; `UpdateFinancialAccount` → `finance.account.update`; `CreateInvoice` → `finance.invoice.create`; `UpdateInvoice` → `finance.invoice.update`; `RecordPayment` → `finance.payment.record`; `RecordCreditAdjustment` → `finance.credit.adjust`; `CreateLedger` → `finance.ledger.create`; `AppendLedgerEntry` → `finance.ledger.append` |
| Queries (6) | `GetFinancialAccount` → `finance.account.read`; `GetInvoice` → `finance.invoice.read`; `GetPayment` → `finance.payment.read`; `GetLedger` → `finance.ledger.read`; `GetCreditAccount` → `finance.credit.read`; `GetFinancialSummary` → `finance.summary.read` |

## 5. CRM — 19

| Kind | Contract → current Policy action |
|---|---|
| Commands (12) | `CreateLead` → `lead.create`; `UpdateLead` → `lead.update`; `QualifyLead` → `lead.qualify`; `ConvertLead` → `lead.convert`; `CreateContact` → `contact.create`; `UpdateContact` → `contact.update`; `CreateAccount` → `account.create`; `UpdateAccount` → `account.update`; `LogActivity` → `activity.log`; `RecordCommunication` → `communication.record`; `CreateCampaign` → `campaign.create`; `UpdateCampaign` → `campaign.update` |
| Queries (7) | `GetLead` → `lead.read`; `GetContact` → `contact.read`; `GetAccount` → `account.read`; `GetActivity` → `activity.read`; `GetCommunication` → `communication.read`; `GetCampaign` → `campaign.read`; `GetCrmSummary` → `crm.summary.read` |

## 6. Projects — 20

| Kind | Contract → current Policy action |
|---|---|
| Commands (12) | `CreateProject` → `project.create`; `UpdateProject` → `project.update`; `ArchiveProject` → `project.archive`; `CreateTask` → `task.create`; `UpdateTask` → `task.update`; `AssignTask` → `task.assign`; `CompleteTask` → `task.complete`; `CreateMilestone` → `milestone.create`; `UpdateMilestone` → `milestone.update`; `AssignResource` → `resource.assign`; `ReleaseResource` → `resource.release`; `UpdateSchedule` → `schedule.update` |
| Queries (8) | `GetProject` → `project.read`; `GetTask` → `task.read`; `GetMilestone` → `milestone.read`; `GetResource` → `resource.read`; `GetTeam` → `team.read`; `GetSchedule` → `schedule.read`; `GetWorkItem` → `work_item.read`; `GetProjectSummary` → `project.summary.read` |

## 7. Service — 16

| Kind | Contract → current Policy action |
|---|---|
| Commands (10) | `CreateServiceRequest` → `service_request.create`; `UpdateServiceRequest` → `service_request.update`; `CloseServiceRequest` → `service_request.close`; `CreateWorkOrder` → `work_order.create`; `UpdateWorkOrder` → `work_order.update`; `CompleteWorkOrder` → `work_order.complete`; `AssignTechnician` → `technician.assign`; `ReassignTechnician` → `technician.reassign`; `ScheduleAppointment` → `appointment.schedule`; `RescheduleAppointment` → `appointment.reschedule` |
| Queries (6) | `GetServiceRequest` → `service_request.read`; `GetWorkOrder` → `work_order.read`; `GetAppointment` → `appointment.read`; `GetTechnicianAssignment` → `technician_assignment.read`; `GetServiceHistory` → `service.history.read`; `GetServiceSummary` → `service.summary.read` |

## 8. Action and resource findings

| Finding | Classification |
|---|---|
| All 107 handlers expose AuthorizationSpec | Implemented |
| 105 unique actions are referenced (two summary queries reuse `order.read` and `po.read`) | Referenced; not seeded |
| Finance and inventory action namespaces are consistent | Implemented vocabulary |
| Sales, procurement, CRM, projects, and service mix unprefixed resource codes with prefixed summary codes | Legacy executable action keys require explicit mapping to canonical `<module>.<resource>.<action>` permissions |
| Resource `companyId` is populated | Implemented |
| Resource `ownerUserId`, `organizationId`, `branchId` | Missing in all current application helpers |
| Resource attributes for amount/stage/project/visibility | Missing from current AuthorizationSpec builders |

## 9. Workflow, rules, and approvals

| Domain | Referenced workflow definitions | Approval types referenced | Runtime registration |
|---|---|---|---|
| Sales | `sales_opportunity_v1`, `quote_v1`, `sales_order_fulfillment_v1` | `sales.order_cancel` | No host registration found |
| Procurement | `purchase_requisition_v1`, `purchase_order_v1` | requisition submit, PO issue/cancel | No registration found |
| Inventory | `inventory_item_v1`, `inventory_warehouse_v1`, `inventory_stock_transfer_v1` | adjustment, transfer | No registration found |
| Finance | `finance_account_v1`, `finance_invoice_v1`, `finance_payment_v1` | invoice issue, credit write-off, large payment | No registration found |
| CRM | `crm_lead_v1`, `crm_campaign_v1` | lead convert/qualify | No registration found |
| Projects | `project_v1`, `project_task_v1`, `project_milestone_v1` | archive, resource assign | No registration found |
| Service | `service_request_v1`, `service_work_order_v1`, `service_appointment_v1` | request close, work-order complete, technician assign | No registration found |

Platform workflow/rules/approval engines and in-memory stores are implemented. Application handlers reference codes and invoke these engines, but production composition does not seed definitions/rule sets. Consequently, an authorization allow does not guarantee a mutating command can complete.

## 10. RC5 documentation comparison

- The count and universal `authorize()` claim are accurate.
- The preferred namespaced examples are **not** the current vocabulary.
- “Per payload resource” currently means company + type/id; own/org/branch/attribute scope is not implemented.
- Workflow and approval permissions can be catalogued, but there are no workflow/approval definitions to authorize operationally.
- RC5 tests must distinguish “Policy allowed and pipeline advanced” from “business command succeeded”; the latter may be blocked by missing RC6 definitions.

## 11. Verdict

CQRS authorization hooks are complete by count. Effective authorization is not operational for ordinary users until exact current action permissions and roles are seeded. Record-level and workflow-aware authorization remain partial/documentation-only.
