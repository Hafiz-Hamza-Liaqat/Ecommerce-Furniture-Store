/**
 * Service request — status is metadata only. Workflow owns lifecycle.
 */

export type ServicePriority = "low" | "normal" | "high" | "critical";

export type ServiceStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled"
  | "closed";

export type ServiceCategoryReference = {
  readonly categoryId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type ServiceRequest = {
  readonly id: string;
  readonly companyId: string;
  readonly number: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: ServiceStatus;
  readonly priority: ServicePriority;
  readonly category: ServiceCategoryReference | null;
  readonly customerId: string | null;
  readonly crmContactId: string | null;
  readonly crmAccountId: string | null;
  readonly projectId: string | null;
  readonly salesOrderId: string | null;
  readonly siteAddressId: string | null;
  readonly requestedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ServiceRequestReference = {
  readonly serviceRequestId: string;
  readonly companyId: string;
  readonly number: string | null;
};
