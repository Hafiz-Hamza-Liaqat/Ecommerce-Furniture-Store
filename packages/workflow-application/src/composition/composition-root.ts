/**
 * Workflow / Approval operator application composition root (RC6.2).
 * Registers thin engine-delegating handlers. No HTTP/SQL/UI.
 */

import { HandlerRegistry } from "@afh/application";
import {
  createAssignWorkflowTaskHandler,
  createClaimApprovalRequestHandler,
  createDecideApprovalRequestHandler,
  createDelegateApprovalRequestHandler,
  createGetApprovalDefinitionHandler,
  createGetApprovalRequestHandler,
  createGetWorkflowDefinitionHandler,
  createGetWorkflowInstanceHandler,
  createListApprovalDefinitionsHandler,
  createListApprovalHistoryHandler,
  createListApprovalRequestsHandler,
  createListAvailableTransitionsHandler,
  createListWorkflowDefinitionsHandler,
  createListWorkflowInstancesHandler,
  createListWorkflowTasksHandler,
  createRegisterApprovalDefinitionHandler,
  createRegisterWorkflowDefinitionHandler,
  createSubmitApprovalRequestHandler,
  createTransitionWorkflowInstanceHandler,
} from "../handlers/index.js";

export type CreateWorkflowApplicationOptions = {
  /** Existing registry to register into (shared with createApplicationRuntime). */
  readonly handlers?: HandlerRegistry;
};

export type WorkflowApplication = {
  readonly handlers: HandlerRegistry;
};

/**
 * Wires workflow/approval operator CQRS handlers into a HandlerRegistry.
 */
export function createWorkflowApplication(
  options: CreateWorkflowApplicationOptions = {},
): WorkflowApplication {
  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createRegisterWorkflowDefinitionHandler());
  handlers.registerCommand(createTransitionWorkflowInstanceHandler());
  handlers.registerCommand(createAssignWorkflowTaskHandler());
  handlers.registerCommand(createRegisterApprovalDefinitionHandler());
  handlers.registerCommand(createSubmitApprovalRequestHandler());
  handlers.registerCommand(createClaimApprovalRequestHandler());
  handlers.registerCommand(createDecideApprovalRequestHandler());
  handlers.registerCommand(createDelegateApprovalRequestHandler());

  handlers.registerQuery(createGetWorkflowDefinitionHandler());
  handlers.registerQuery(createListWorkflowDefinitionsHandler());
  handlers.registerQuery(createGetWorkflowInstanceHandler());
  handlers.registerQuery(createListWorkflowInstancesHandler());
  handlers.registerQuery(createListAvailableTransitionsHandler());
  handlers.registerQuery(createListWorkflowTasksHandler());
  handlers.registerQuery(createGetApprovalDefinitionHandler());
  handlers.registerQuery(createListApprovalDefinitionsHandler());
  handlers.registerQuery(createGetApprovalRequestHandler());
  handlers.registerQuery(createListApprovalRequestsHandler());
  handlers.registerQuery(createListApprovalHistoryHandler());

  return { handlers };
}
