/**
 * Project validation contracts — structural checks only.
 * No scheduling rules, workload balancing, or project business rules.
 */

import type { Validator } from "@afh/shared-kernel";
import {
  validationFail,
  validationOk,
  type ValidationOutcome,
} from "@afh/shared-kernel";
import type { Project } from "../project/project.js";
import type { Resource } from "../resource/resource.js";
import type { Team, TeamMembership } from "../team/team.js";
import type { Task } from "../task/task.js";
import type { Milestone } from "../milestone/milestone.js";
import type { Schedule } from "../schedule/schedule.js";
import type { WorkItem, WorkAssignment } from "../work-item/work-item.js";

function requireNonEmpty(
  field: string,
  value: string | null | undefined,
): ValidationOutcome | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const projectStructureValidator: Validator<Project> = {
  validate(input: Project): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const resourceStructureValidator: Validator<Resource> = {
  validate(input: Resource): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const teamStructureValidator: Validator<Team> = {
  validate(input: Team): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("code", input.code) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const teamMembershipStructureValidator: Validator<TeamMembership> = {
  validate(input: TeamMembership): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("teamId", input.teamId) ??
      validationOk()
    );
  },
};

export const taskStructureValidator: Validator<Task> = {
  validate(input: Task): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const milestoneStructureValidator: Validator<Milestone> = {
  validate(input: Milestone): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("projectId", input.projectId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const scheduleStructureValidator: Validator<Schedule> = {
  validate(input: Schedule): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("name", input.name) ??
      validationOk()
    );
  },
};

export const workItemStructureValidator: Validator<WorkItem> = {
  validate(input: WorkItem): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("title", input.title) ??
      validationOk()
    );
  },
};

export const workAssignmentStructureValidator: Validator<WorkAssignment> = {
  validate(input: WorkAssignment): ValidationOutcome {
    return (
      requireNonEmpty("id", input.id) ??
      requireNonEmpty("companyId", input.companyId) ??
      requireNonEmpty("workItemId", input.workItemId) ??
      requireNonEmpty("assigneeId", input.assigneeId) ??
      validationOk()
    );
  },
};

export type ProjectValidators = {
  readonly project: Validator<Project>;
  readonly resource: Validator<Resource>;
  readonly team: Validator<Team>;
  readonly teamMembership: Validator<TeamMembership>;
  readonly task: Validator<Task>;
  readonly milestone: Validator<Milestone>;
  readonly schedule: Validator<Schedule>;
  readonly workItem: Validator<WorkItem>;
  readonly workAssignment: Validator<WorkAssignment>;
};

export function createProjectValidators(): ProjectValidators {
  return {
    project: projectStructureValidator,
    resource: resourceStructureValidator,
    team: teamStructureValidator,
    teamMembership: teamMembershipStructureValidator,
    task: taskStructureValidator,
    milestone: milestoneStructureValidator,
    schedule: scheduleStructureValidator,
    workItem: workItemStructureValidator,
    workAssignment: workAssignmentStructureValidator,
  };
}
