/**
 * Shared ERP module presentation types — UI only; business rules stay on the API.
 */

export type FieldType = "text" | "number" | "select" | "textarea" | "date" | "currency";

export type FormField = {
  readonly name: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly placeholder?: string;
  /** Presentation-only metadata; backend Policy remains authoritative. */
  readonly permissionView?: string;
  readonly permissionEdit?: string;
  readonly sensitivity?: "internal" | "financial" | "pii" | "restricted";
};

export function canPresentField(
  field: FormField,
  permissionCodes: readonly string[] | null,
): boolean {
  return (
    field.permissionView === undefined ||
    permissionCodes?.includes(field.permissionView) === true
  );
}

export function canEditPresentedField(
  field: FormField,
  permissionCodes: readonly string[] | null,
): boolean {
  return (
    canPresentField(field, permissionCodes) &&
    (field.permissionEdit === undefined ||
      permissionCodes?.includes(field.permissionEdit) === true)
  );
}

export type ColumnDef = {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
};

export type FilterDef = {
  readonly key: string;
  readonly label: string;
  readonly options?: readonly string[];
};

export type RecordRow = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly meta: Record<string, string | number>;
  readonly description?: string;
  readonly amount?: string;
  readonly tags?: readonly string[];
  readonly source?: "fixture" | "api" | "local";
};

export type LifecycleAction = {
  readonly id: string;
  readonly label: string;
  readonly commandType: string;
  readonly tone?: "primary" | "danger" | "ghost";
  readonly buildPayload: (
    companyId: string,
    recordId: string,
    row: RecordRow,
  ) => Record<string, unknown>;
};

export type ApiBinding = {
  readonly createCommandType?: string;
  readonly updateCommandType?: string;
  readonly getQueryType?: string;
  readonly summaryQueryType?: string;
  /**
   * RC7.3 — live List* query type (e.g. sales.ListOpportunity).
   * When set, ModuleApp EntityListPage uses CQRS instead of fixtures
   * (Production: fail-closed; Demo: fixtures only as explicit fallback).
   */
  readonly listQueryType?: string;
  /** Build ListQueryRequest payload; defaults to shared buildDefaultListPayload. */
  readonly buildListPayload?: (
    companyId: string,
    args: {
      readonly page: number;
      readonly pageSize: number;
      readonly q?: string;
      readonly filters: Readonly<Record<string, string>>;
      readonly sortField?: string;
      readonly sortDir?: "asc" | "desc";
    },
  ) => Record<string, unknown>;
  /** Map a List* row; defaults to mapEntity. */
  readonly mapListEntity?: (data: unknown) => RecordRow | null;
  /** Build create payload from form values + companyId */
  readonly buildCreatePayload?: (
    companyId: string,
    values: Record<string, string>,
  ) => Record<string, unknown>;
  /** Build update payload from form values + companyId + record id */
  readonly buildUpdatePayload?: (
    companyId: string,
    recordId: string,
    values: Record<string, string>,
  ) => Record<string, unknown>;
  /** Build get payload */
  readonly buildGetPayload?: (
    companyId: string,
    id: string,
  ) => Record<string, unknown>;
  /** Extract created id from command result */
  readonly extractCreateId?: (data: unknown) => string | null;
  /** Map API entity to a list/detail row */
  readonly mapEntity?: (data: unknown) => RecordRow | null;
  /** When set, create uses POST /api/v1/uploads instead of dispatchCommand */
  readonly uploadAsset?: boolean;
  /** Detail-page lifecycle commands (Workflow/Approval remain server-side) */
  readonly lifecycleActions?: readonly LifecycleAction[];
};

export type EntityDef = {
  readonly key: string;
  readonly label: string;
  readonly plural: string;
  readonly description: string;
  readonly columns: readonly ColumnDef[];
  readonly filters: readonly FilterDef[];
  readonly fields: readonly FormField[];
  readonly records: readonly RecordRow[];
  readonly api?: ApiBinding;
  readonly kanban?: boolean;
  readonly analytics?: boolean;
};

export type ModuleNavItem = {
  readonly to: string;
  readonly label: string;
  readonly entityKey?: string;
};

export type ModuleKpi = {
  readonly label: string;
  readonly value: string;
  readonly trend?: number;
  readonly href?: string;
};

export type ModuleDefinition = {
  readonly id:
    | "sales"
    | "procurement"
    | "inventory"
    | "finance"
    | "projects"
    | "crm"
    | "service"
    | "hr"
    | "manufacturing"
    | "cms"
    | "dam"
    | "notifications"
    | "search"
    | "reporting";
  readonly title: string;
  readonly lead: string;
  readonly basePath: string;
  readonly nav: readonly ModuleNavItem[];
  readonly kpis: readonly ModuleKpi[];
  readonly entities: readonly EntityDef[];
  readonly summaryQueryType?: string;
  readonly buildSummaryPayload?: (companyId: string) => Record<string, unknown>;
};
