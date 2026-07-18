/**
 * Projects application validators — intent only.
 * Scheduling/allocation/costing remain in Rules.
 */

import type { Command, Query, Validator } from "@afh/shared-kernel";
import {
  validateFilterAllowList,
  validateSortAllowList,
  validationFail,
  validationOk,
} from "@afh/shared-kernel";
import type {
  ArchiveProjectPayload,
  AssignResourcePayload,
  AssignTaskPayload,
  CompleteTaskPayload,
  CreateMilestonePayload,
  CreateProjectPayload,
  CreateTaskPayload,
  ReleaseResourcePayload,
  UpdateMilestonePayload,
  UpdateProjectPayload,
  UpdateSchedulePayload,
  UpdateTaskPayload,
} from "../commands/commands.js";
import type {
  GetMilestonePayload,
  GetProjectPayload,
  GetProjectSummaryPayload,
  GetResourcePayload,
  GetSchedulePayload,
  GetTaskPayload,
  GetTeamPayload,
  GetWorkItemPayload,
  ListMilestonePayload,
  ListProjectPayload,
  ListTaskPayload,
} from "../queries/queries.js";
import {
  MILESTONE_FILTER_FIELDS,
  MILESTONE_SORT_FIELDS,
  PROJECT_FILTER_FIELDS,
  PROJECT_SORT_FIELDS,
  TASK_FILTER_FIELDS,
  TASK_SORT_FIELDS,
} from "../list-fields.js";

function requireField(
  field: string,
  value: string | null | undefined,
): ReturnType<typeof validationFail> | null {
  if (value == null || value.trim().length === 0) {
    return validationFail([
      { field, code: "required", message: `${field} is required` },
    ]);
  }
  return null;
}

export const createProjectCommandValidator: Validator<
  Command<CreateProjectPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("code", p.code) ??
      requireField("name", p.name) ??
      requireField("projectType", p.projectType) ??
      requireField("classification", p.classification) ??
      validationOk()
    );
  },
};

export const updateProjectCommandValidator: Validator<
  Command<UpdateProjectPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("projectId", p.projectId);
    if (base) return base;
    if (p.transitionCode && !p.workflowInstanceId) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message: "workflowInstanceId is required when transitionCode is set",
        },
      ]);
    }
    return validationOk();
  },
};

export const archiveProjectCommandValidator: Validator<
  Command<ArchiveProjectPayload>
> = {
  validate(command) {
    const p = command.payload;
    const base =
      requireField("companyId", p.companyId) ??
      requireField("projectId", p.projectId);
    if (base) return base;
    if (!p.requireApproval && !p.workflowInstanceId?.trim()) {
      return validationFail([
        {
          field: "workflowInstanceId",
          code: "required",
          message:
            "workflowInstanceId is required when archiving (or set requireApproval)",
        },
      ]);
    }
    return validationOk();
  },
};

export const createTaskCommandValidator: Validator<Command<CreateTaskPayload>> =
  {
    validate(command) {
      const p = command.payload;
      return (
        requireField("companyId", p.companyId) ??
        requireField("title", p.title) ??
        validationOk()
      );
    },
  };

export const updateTaskCommandValidator: Validator<Command<UpdateTaskPayload>> =
  {
    validate(command) {
      const p = command.payload;
      return (
        requireField("companyId", p.companyId) ??
        requireField("taskId", p.taskId) ??
        validationOk()
      );
    },
  };

export const assignTaskCommandValidator: Validator<Command<AssignTaskPayload>> =
  {
    validate(command) {
      const p = command.payload;
      const base =
        requireField("companyId", p.companyId) ??
        requireField("taskId", p.taskId);
      if (base) return base;
      if (!p.assigneeUserId?.trim() && !p.assigneeTeamId?.trim()) {
        return validationFail([
          {
            field: "assigneeUserId",
            code: "required",
            message: "assigneeUserId or assigneeTeamId is required",
          },
        ]);
      }
      return validationOk();
    },
  };

export const completeTaskCommandValidator: Validator<
  Command<CompleteTaskPayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("taskId", p.taskId) ??
      validationOk()
    );
  },
};

export const createMilestoneCommandValidator: Validator<
  Command<CreateMilestonePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("projectId", p.projectId) ??
      requireField("name", p.name) ??
      validationOk()
    );
  },
};

export const updateMilestoneCommandValidator: Validator<
  Command<UpdateMilestonePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("milestoneId", p.milestoneId) ??
      validationOk()
    );
  },
};

export const assignResourceCommandValidator: Validator<
  Command<AssignResourcePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("resourceId", p.resourceId) ??
      validationOk()
    );
  },
};

export const releaseResourceCommandValidator: Validator<
  Command<ReleaseResourcePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("resourceId", p.resourceId) ??
      validationOk()
    );
  },
};

export const updateScheduleCommandValidator: Validator<
  Command<UpdateSchedulePayload>
> = {
  validate(command) {
    const p = command.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("scheduleId", p.scheduleId) ??
      validationOk()
    );
  },
};

export const getProjectQueryValidator: Validator<Query<GetProjectPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("projectId", p.projectId) ??
      validationOk()
    );
  },
};

export const getTaskQueryValidator: Validator<Query<GetTaskPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("taskId", p.taskId) ??
      validationOk()
    );
  },
};

export const getMilestoneQueryValidator: Validator<
  Query<GetMilestonePayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("milestoneId", p.milestoneId) ??
      validationOk()
    );
  },
};

export const getResourceQueryValidator: Validator<Query<GetResourcePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("resourceId", p.resourceId) ??
      validationOk()
    );
  },
};

export const getTeamQueryValidator: Validator<Query<GetTeamPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("teamId", p.teamId) ??
      validationOk()
    );
  },
};

export const getScheduleQueryValidator: Validator<Query<GetSchedulePayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("scheduleId", p.scheduleId) ??
      validationOk()
    );
  },
};

export const getWorkItemQueryValidator: Validator<Query<GetWorkItemPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("workItemId", p.workItemId) ??
      validationOk()
    );
  },
};

export const getProjectSummaryQueryValidator: Validator<
  Query<GetProjectSummaryPayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      requireField("projectId", p.projectId) ??
      validationOk()
    );
  },
};

function listCriteriaViolations(
  payload: ListProjectPayload | ListTaskPayload | ListMilestonePayload,
  sortFields: ReadonlySet<string>,
  filterFields: ReadonlySet<string>,
): ReturnType<typeof validationFail> | null {
  const sort = validateSortAllowList(payload.criteria?.sort, sortFields);
  if (!sort.ok) {
    return validationFail([
      {
        field: "criteria.sort",
        code: sort.error.code,
        message: sort.error.message,
      },
    ]);
  }
  const filters = validateFilterAllowList(
    payload.criteria?.filters,
    filterFields,
  );
  if (!filters.ok) {
    return validationFail([
      {
        field: "criteria.filters",
        code: filters.error.code,
        message: filters.error.message,
      },
    ]);
  }
  return null;
}

export const listProjectQueryValidator: Validator<Query<ListProjectPayload>> =
  {
    validate(query) {
      const p = query.payload;
      return (
        requireField("companyId", p.companyId) ??
        listCriteriaViolations(p, PROJECT_SORT_FIELDS, PROJECT_FILTER_FIELDS) ??
        validationOk()
      );
    },
  };

export const listTaskQueryValidator: Validator<Query<ListTaskPayload>> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(p, TASK_SORT_FIELDS, TASK_FILTER_FIELDS) ??
      validationOk()
    );
  },
};

export const listMilestoneQueryValidator: Validator<
  Query<ListMilestonePayload>
> = {
  validate(query) {
    const p = query.payload;
    return (
      requireField("companyId", p.companyId) ??
      listCriteriaViolations(
        p,
        MILESTONE_SORT_FIELDS,
        MILESTONE_FILTER_FIELDS,
      ) ??
      validationOk()
    );
  },
};
