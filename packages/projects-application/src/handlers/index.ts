export type { ProjectHandlerDeps } from "./deps.js";
export {
  createCreateProjectHandler,
  createUpdateProjectHandler,
  createArchiveProjectHandler,
} from "./project-handlers.js";
export {
  createCreateTaskHandler,
  createUpdateTaskHandler,
  createAssignTaskHandler,
  createCompleteTaskHandler,
  createCreateMilestoneHandler,
  createUpdateMilestoneHandler,
} from "./task-milestone-handlers.js";
export {
  createAssignResourceHandler,
  createReleaseResourceHandler,
  createUpdateScheduleHandler,
} from "./resource-schedule-handlers.js";
export {
  createGetProjectHandler,
  createGetTaskHandler,
  createGetMilestoneHandler,
  createGetResourceHandler,
  createGetTeamHandler,
  createGetScheduleHandler,
  createGetWorkItemHandler,
  createGetProjectSummaryHandler,
} from "./query-handlers.js";
