/**
 * Project foundation — no project lifecycle / workflow.
 * Status is a data field only; Workflow remains lifecycle SSoT later.
 */

export type ProjectType =
  | "interior"
  | "architecture"
  | "civil"
  | "contracting"
  | "furniture"
  | "service"
  | "other";

export type ProjectStatus =
  | "draft"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";

export type ProjectClassification =
  | "residential"
  | "commercial"
  | "industrial"
  | "institutional"
  | "internal"
  | "other";

export type Project = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string;
  readonly name: string;
  readonly projectType: ProjectType;
  readonly status: ProjectStatus;
  readonly classification: ProjectClassification;
  readonly customerId: string | null;
  readonly organizationId: string | null;
  readonly siteAddressId: string | null;
  readonly ownerUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ProjectReference = {
  readonly projectId: string;
  readonly companyId: string;
  readonly code: string | null;
};
