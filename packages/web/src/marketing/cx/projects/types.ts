/**
 * RC9.4 — Furnishing project model (shared by Planner + AI Consultant).
 * Client persistence only; server sync deferred to later phases.
 */

import type { ConsultantMemory } from "../intelligent/types";
import type { SpaceBrief, SpaceTemplateId } from "../intelligent/space-brief";
import type { PlannerHandoffLine } from "../intelligent/handoff";
import type { ConsultantMessage } from "../stores";

export type ProjectStatus =
  | "draft"
  | "planning"
  | "quoted"
  | "pending_approval"
  | "approved"
  | "production"
  | "completed"
  | "archived";

export type CollaboratorPermission = "view" | "comment" | "suggest" | "edit" | "owner";

export type SharePermission = "view" | "comment" | "edit";

export type ProjectRoom = {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly templateId: SpaceTemplateId;
  readonly brief: SpaceBrief;
  readonly activeTier: "economy" | "recommended" | "premium";
  readonly lines: readonly PlannerHandoffLine[];
  readonly totalPkr: number;
  readonly explanations: readonly string[];
  readonly upgrades: readonly string[];
  readonly downgrades: readonly string[];
  readonly packageName: string;
  readonly notes: readonly string[];
  /**
   * When true, empty or edited lines are intentional (user customized).
   * Prevents AI re-seed on refresh after Remove.
   */
  readonly packageCustomized?: boolean;
};

export type ProjectNote = {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string;
  readonly authorId: string;
  readonly authorLabel: string;
};

export type ProjectQuote = {
  readonly id: string;
  readonly createdAt: string;
  readonly label: string;
  readonly lines: readonly { productId: string; qty: number; unitPkr: number; name: string }[];
  readonly totalPkr: number;
  readonly isLatest: boolean;
};

export type ProjectCollaborator = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly permission: CollaboratorPermission;
  readonly invitedAt: string;
};

export type ProjectShareLink = {
  readonly id: string;
  readonly token: string;
  readonly permission: SharePermission;
  readonly createdAt: string;
  readonly label: string;
};

export type ProjectVersionDiff = {
  readonly budgetDeltaPkr: number;
  readonly productsAdded: readonly string[];
  readonly productsRemoved: readonly string[];
  readonly roomChanges: readonly string[];
  readonly aiSummary?: string;
};

export type ProjectVersion = {
  readonly id: string;
  readonly versionNumber: number;
  readonly label: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly rooms: readonly ProjectRoom[];
  readonly consultantMemory: ConsultantMemory;
  readonly consultantMessages: readonly ConsultantMessage[];
  readonly status: ProjectStatus;
  readonly notes: readonly ProjectNote[];
  readonly totalBudgetPkr: number;
  readonly totalPackagePkr: number;
  readonly diff?: ProjectVersionDiff;
};

export type FurnishingProject = {
  readonly id: string;
  readonly title: string;
  readonly status: ProjectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly ownerId: string;
  readonly ownerLabel: string;
  readonly customerName?: string;
  readonly templateId: SpaceTemplateId;
  readonly rooms: readonly ProjectRoom[];
  readonly activeRoomId: string;
  readonly consultantMemory: ConsultantMemory;
  readonly consultantMessages: readonly ConsultantMessage[];
  readonly quotes: readonly ProjectQuote[];
  readonly notes: readonly ProjectNote[];
  readonly collaborators: readonly ProjectCollaborator[];
  readonly shareLinks: readonly ProjectShareLink[];
  readonly versions: readonly ProjectVersion[];
  readonly latestVersionId: string;
  readonly aiAssisted: boolean;
  readonly plannerSummary?: string;
  readonly aiSummary?: string;
};

/** Lightweight row for dashboard (lazy list). */
export type ProjectListItem = {
  readonly id: string;
  readonly title: string;
  readonly status: ProjectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly ownerLabel: string;
  readonly customerName?: string;
  readonly templateId: SpaceTemplateId;
  readonly budgetPkr: number;
  readonly totalPkr: number;
  readonly roomCount: number;
  readonly aiAssisted: boolean;
  readonly quotationStatus?: string;
  readonly latestVersionNumber: number;
};

export type ProjectListQuery = {
  readonly search?: string;
  readonly status?: ProjectStatus | "all";
  readonly sort?: "updated" | "created" | "budget" | "title";
  readonly customer?: string;
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  planning: "Planning",
  quoted: "Quoted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  production: "Production",
  completed: "Completed",
  archived: "Archived",
};
