/**
 * Approval Engine — human decision infrastructure only.
 */

export type ApprovalRequestStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export type ApprovalDefinitionRecord = {
  readonly id: string;
  readonly companyId: string | null;
  readonly type: string;
  readonly name: string;
  readonly createdAt: string;
};

export type ApprovalRequestRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly branchId: string | null;
  readonly type: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly status: ApprovalRequestStatus;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly submittedByUserId: string;
  readonly reviewerUserId: string | null;
  readonly delegatedToUserId: string | null;
  readonly escalateAfterHours: number | null;
  readonly decisionReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ApprovalActionRecord = {
  readonly id: string;
  readonly approvalRequestId: string;
  readonly actorUserId: string;
  readonly action:
    | "submit"
    | "claim"
    | "approve"
    | "reject"
    | "request_changes"
    | "delegate"
    | "escalate";
  readonly comment: string | null;
  readonly createdAt: string;
};
