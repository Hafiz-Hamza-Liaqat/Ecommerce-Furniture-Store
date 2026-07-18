import type { AuthorizationSpec } from "../handlers/handlers.js";

export function parentEntityResource(
  parentResourceType: string,
  action: string,
  companyId: string,
  parentEntityId: string,
  scope?: {
    readonly branchId?: string | null;
    readonly ownerUserId?: string | null;
    readonly organizationId?: string | null;
  },
): AuthorizationSpec {
  return {
    action,
    resource: {
      type: parentResourceType,
      id: parentEntityId,
      companyId,
      ownerUserId: scope?.ownerUserId ?? null,
      organizationId: scope?.organizationId ?? null,
      branchId: scope?.branchId ?? null,
    },
  };
}
