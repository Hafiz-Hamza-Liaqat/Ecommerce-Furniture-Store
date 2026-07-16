# RC2 — Workflow Integration Report

| Topic | Finding |
|-------|---------|
| Workflow SSoT | Remains server-side; update payloads optionally carry `workflowInstanceId` / `transitionCode` when operators supply them |
| Approval SSoT | Lifecycle commands set `requireApproval: true` where handlers support it — ApprovalEngine decides |
| Rules / Policy / Application Runtime | Unchanged; commands flow Commands API → handlers |
| No UI shortcuts | Cancel/Issue/Qualify/Close do not mutate status locally as business truth; they dispatch commands |
| CQRS gap | No `workflow.Get*` / `approval.List*` handlers — false `workflow.GetInstance` claim removed from MODULES |
| Operator UI | `/app/workflow` and `/app/approvals` remain presentation queues until CQRS wrappers exist |

**RC2 does not invent Workflow/Approval query APIs.**
