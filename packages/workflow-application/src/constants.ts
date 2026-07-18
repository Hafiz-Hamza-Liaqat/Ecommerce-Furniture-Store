/**
 * Workflow / Approval operator CQRS constants (RC6.2).
 */

export const WorkflowCommandTypes = {
  RegisterDefinition: "workflow.RegisterDefinition",
  TransitionInstance: "workflow.TransitionInstance",
  AssignTask: "workflow.AssignTask",
} as const;

export const WorkflowQueryTypes = {
  GetDefinition: "workflow.GetDefinition",
  ListDefinitions: "workflow.ListDefinitions",
  GetInstance: "workflow.GetInstance",
  ListInstances: "workflow.ListInstances",
  ListAvailableTransitions: "workflow.ListAvailableTransitions",
  ListTasks: "workflow.ListTasks",
} as const;

export const ApprovalCommandTypes = {
  RegisterDefinition: "approval.RegisterDefinition",
  SubmitRequest: "approval.SubmitRequest",
  ClaimRequest: "approval.ClaimRequest",
  DecideRequest: "approval.DecideRequest",
  DelegateRequest: "approval.DelegateRequest",
} as const;

export const ApprovalQueryTypes = {
  GetDefinition: "approval.GetDefinition",
  ListDefinitions: "approval.ListDefinitions",
  GetRequest: "approval.GetRequest",
  ListRequests: "approval.ListRequests",
  ListHistory: "approval.ListHistory",
} as const;

/**
 * RC6.2 platform operator permission codes.
 * Distinct from route-only `platform.workflows.read` / `platform.approvals.read`.
 */
export const WorkflowPolicyActions = {
  DefinitionRead: "platform.workflow_definitions.read",
  DefinitionCreate: "platform.workflow_definitions.create",
  InstanceRead: "platform.workflow_instances.read",
  InstanceTransition: "platform.workflow_instances.transition",
  TaskRead: "platform.workflow_tasks.read",
  TaskAssign: "platform.workflow_tasks.assign",
} as const;

export const ApprovalPolicyActions = {
  DefinitionRead: "platform.approval_definitions.read",
  DefinitionCreate: "platform.approval_definitions.create",
  RequestRead: "platform.approval_requests.read",
  RequestSubmit: "platform.approval_requests.submit",
  RequestClaim: "platform.approval_requests.claim",
  RequestApprove: "platform.approval_requests.approve",
  RequestReject: "platform.approval_requests.reject",
  RequestDelegate: "platform.approval_requests.delegate",
} as const;
