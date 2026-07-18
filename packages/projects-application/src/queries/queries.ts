/**
 * Projects application queries — no transport DTOs.
 */

import type { ListQueryRequest, PageRequest } from "@afh/shared-kernel";
import { ProjectsQueryTypes } from "../constants.js";

/** RC7.2f — shared List* envelope (companyId + optional criteria / q). */
export type ListProjectPayload = ListQueryRequest;
export type ListTaskPayload = ListQueryRequest;
export type ListMilestonePayload = ListQueryRequest;

export type GetProjectPayload = {
  readonly companyId: string;
  readonly projectId: string;
};

export type GetTaskPayload = {
  readonly companyId: string;
  readonly taskId: string;
};

export type GetMilestonePayload = {
  readonly companyId: string;
  readonly milestoneId: string;
};

export type GetResourcePayload = {
  readonly companyId: string;
  readonly resourceId: string;
};

export type GetTeamPayload = {
  readonly companyId: string;
  readonly teamId: string;
  readonly includeMemberships?: boolean;
};

export type GetSchedulePayload = {
  readonly companyId: string;
  readonly scheduleId: string;
};

export type GetWorkItemPayload = {
  readonly companyId: string;
  readonly workItemId: string;
};

export type GetProjectSummaryPayload = {
  readonly companyId: string;
  readonly projectId: string;
  readonly page?: PageRequest;
};

export type ProjectSummary = {
  readonly companyId: string;
  readonly projectId: string;
  readonly taskCount: number;
  readonly milestoneCount: number;
  readonly workItemCount: number;
  readonly openTaskIds: readonly string[];
  readonly completedMilestoneIds: readonly string[];
  readonly openWorkItemIds: readonly string[];
};

export { ProjectsQueryTypes };
