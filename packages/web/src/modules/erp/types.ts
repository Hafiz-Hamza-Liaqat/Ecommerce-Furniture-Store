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
};

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

export type ApiBinding = {
  readonly createCommandType?: string;
  readonly getQueryType?: string;
  readonly summaryQueryType?: string;
  /** Build create payload from form values + companyId */
  readonly buildCreatePayload?: (
    companyId: string,
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
