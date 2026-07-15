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

export type ProjectHandlerDeps = {
  readonly projects: ProjectRepository;
  readonly tasks: TaskRepository;
  readonly milestones: MilestoneRepository;
  readonly resources: ResourceRepository;
  readonly teams: TeamRepository;
  readonly schedules: ScheduleRepository;
  readonly workItems: WorkItemRepository;
  readonly outbox: OutboxStore;
  readonly audit: SecurityAuditService;
};
