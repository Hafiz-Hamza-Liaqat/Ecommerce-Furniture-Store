/**
 * Project repository interfaces only — no persistence implementations.
 */

import type {
  PlatformError,
  Result,
  Page,
  PageRequest,
} from "@afh/shared-kernel";
import type { Project } from "../project/project.js";
import type { Resource } from "../resource/resource.js";
import type { Team, TeamMembership } from "../team/team.js";
import type { Task } from "../task/task.js";
import type { Milestone } from "../milestone/milestone.js";
import type { Schedule } from "../schedule/schedule.js";
import type { WorkItem, WorkAssignment } from "../work-item/work-item.js";

export type CompanyScopedId = {
  readonly companyId: string;
  readonly id: string;
};

export interface ProjectRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Project | null, PlatformError>>;
  save(project: Project): Promise<Result<void, PlatformError>>;
  remove(key: CompanyScopedId): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Project>, PlatformError>>;
}

export interface ResourceRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Resource | null, PlatformError>>;
  save(resource: Resource): Promise<Result<void, PlatformError>>;
  listByCompany(
    companyId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Resource>, PlatformError>>;
}

export interface TeamRepository {
  findById(key: CompanyScopedId): Promise<Result<Team | null, PlatformError>>;
  save(team: Team): Promise<Result<void, PlatformError>>;
  saveMembership(
    membership: TeamMembership,
  ): Promise<Result<void, PlatformError>>;
  listMemberships(
    companyId: string,
    teamId: string,
  ): Promise<Result<readonly TeamMembership[], PlatformError>>;
}

export interface TaskRepository {
  findById(key: CompanyScopedId): Promise<Result<Task | null, PlatformError>>;
  save(task: Task): Promise<Result<void, PlatformError>>;
  listByProject(
    companyId: string,
    projectId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Task>, PlatformError>>;
  listChildren(
    companyId: string,
    parentTaskId: string,
  ): Promise<Result<readonly Task[], PlatformError>>;
}

export interface MilestoneRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Milestone | null, PlatformError>>;
  save(milestone: Milestone): Promise<Result<void, PlatformError>>;
  listByProject(
    companyId: string,
    projectId: string,
    page?: PageRequest,
  ): Promise<Result<Page<Milestone>, PlatformError>>;
}

export interface ScheduleRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<Schedule | null, PlatformError>>;
  save(schedule: Schedule): Promise<Result<void, PlatformError>>;
}

export interface WorkItemRepository {
  findById(
    key: CompanyScopedId,
  ): Promise<Result<WorkItem | null, PlatformError>>;
  save(workItem: WorkItem): Promise<Result<void, PlatformError>>;
  saveAssignment(
    assignment: WorkAssignment,
  ): Promise<Result<void, PlatformError>>;
  listByProject(
    companyId: string,
    projectId: string,
    page?: PageRequest,
  ): Promise<Result<Page<WorkItem>, PlatformError>>;
}
