/**
 * Projects application composition root.
 * Registers handlers into the Phase 5B HandlerRegistry. No HTTP/APIs.
 */

import { HandlerRegistry } from "@afh/application";
import type { OutboxStore } from "@afh/persistence";
import type { SecurityAuditService } from "@afh/identity";
import type {
  MilestoneRepository,
  ProjectRepository,
  ResourceRepository,
  ScheduleRepository,
  TaskRepository,
  TeamRepository,
  WorkItemRepository,
} from "@afh/projects";
import {
  createArchiveProjectHandler,
  createAssignResourceHandler,
  createAssignTaskHandler,
  createCompleteTaskHandler,
  createCreateMilestoneHandler,
  createCreateProjectHandler,
  createCreateTaskHandler,
  createGetMilestoneHandler,
  createGetProjectHandler,
  createGetProjectSummaryHandler,
  createGetResourceHandler,
  createGetScheduleHandler,
  createGetTaskHandler,
  createGetTeamHandler,
  createGetWorkItemHandler,
  createReleaseResourceHandler,
  createUpdateMilestoneHandler,
  createUpdateProjectHandler,
  createUpdateScheduleHandler,
  createUpdateTaskHandler,
} from "../handlers/index.js";
import type { ProjectHandlerDeps } from "../handlers/deps.js";

export type CreateProjectApplicationOptions = {
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly milestones: MilestoneRepository;
  readonly resources: ResourceRepository;
  readonly teams: TeamRepository;
  readonly schedules: ScheduleRepository;
  readonly workItems: WorkItemRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
  readonly handlers?: HandlerRegistry;
};

export type ProjectApplication = {
  readonly handlers: HandlerRegistry;
  readonly deps: ProjectHandlerDeps;
};

/**
 * Wires Project command/query handlers into a HandlerRegistry.
 * Host then passes `handlers` to `createApplicationRuntime({ handlers, ... })`.
 */
export function createProjectApplication(
  options: CreateProjectApplicationOptions,
): ProjectApplication {
  const deps: ProjectHandlerDeps = {
    projects: options.projects,
    tasks: options.tasks,
    milestones: options.milestones,
    resources: options.resources,
    teams: options.teams,
    schedules: options.schedules,
    workItems: options.workItems,
    outbox: options.outbox,
    audit: options.audit,
  };

  const handlers = options.handlers ?? new HandlerRegistry();

  handlers.registerCommand(createCreateProjectHandler(deps));
  handlers.registerCommand(createUpdateProjectHandler(deps));
  handlers.registerCommand(createArchiveProjectHandler(deps));
  handlers.registerCommand(createCreateTaskHandler(deps));
  handlers.registerCommand(createUpdateTaskHandler(deps));
  handlers.registerCommand(createAssignTaskHandler(deps));
  handlers.registerCommand(createCompleteTaskHandler(deps));
  handlers.registerCommand(createCreateMilestoneHandler(deps));
  handlers.registerCommand(createUpdateMilestoneHandler(deps));
  handlers.registerCommand(createAssignResourceHandler(deps));
  handlers.registerCommand(createReleaseResourceHandler(deps));
  handlers.registerCommand(createUpdateScheduleHandler(deps));

  handlers.registerQuery(createGetProjectHandler(deps));
  handlers.registerQuery(createGetTaskHandler(deps));
  handlers.registerQuery(createGetMilestoneHandler(deps));
  handlers.registerQuery(createGetResourceHandler(deps));
  handlers.registerQuery(createGetTeamHandler(deps));
  handlers.registerQuery(createGetScheduleHandler(deps));
  handlers.registerQuery(createGetWorkItemHandler(deps));
  handlers.registerQuery(createGetProjectSummaryHandler(deps));

  return { handlers, deps };
}
