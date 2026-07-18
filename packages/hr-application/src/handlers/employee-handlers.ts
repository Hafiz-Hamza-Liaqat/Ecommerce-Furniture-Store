import type { CommandHandler, FetchListCandidates, QueryHandler } from "@afh/application";
import {
  buildAuthorizedListPage,
  principalListScope,
} from "@afh/application";
import type { EmploymentProfile, EmploymentType } from "@afh/hr";
import type { Page } from "@afh/shared-kernel";
import { NotFoundError, fail, ok } from "@afh/shared-kernel";
import {
  HrCommandTypes,
  HrPolicyActions,
  HrQueryTypes,
  KNOWN_EMPLOYMENT_TYPES,
} from "../constants.js";
import type { CreateEmployeePayload } from "../commands/commands.js";
import type {
  GetEmployeePayload,
  GetEmployeeResult,
  ListEmployeePayload,
} from "../queries/queries.js";
import {
  createEmployeeCommandValidator,
  getEmployeeQueryValidator,
  listEmployeeQueryValidator,
} from "../validators/validators.js";
import type { HrHandlerDeps } from "./deps.js";
import {
  companyResource,
  loadRecordForAuthorization,
  newEntityId,
  recordHrAudit,
  requireCompanyId,
} from "../support/support.js";

export type CreateEmployeeResult = {
  readonly employeeId: string;
};

function mapEmploymentType(value: string | undefined): EmploymentType {
  return (
    KNOWN_EMPLOYMENT_TYPES as readonly string[]
  ).includes(value ?? "")
    ? (value as EmploymentType)
    : "full_time";
}

export function createCreateEmployeeHandler(
  deps: HrHandlerDeps,
): CommandHandler<CreateEmployeePayload, CreateEmployeeResult> {
  return {
    commandType: HrCommandTypes.CreateEmployee,
    authorize(command) {
      return companyResource(
        "employee",
        HrPolicyActions.EmployeeCreate,
        command.payload.companyId,
      );
    },
    validate() {
      return createEmployeeCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;
      const id = newEntityId();
      const now = ctx.clock.now().toISOString();

      const employee: EmploymentProfile = {
        id,
        companyId: scope.value,
        employeeCode: p.employeeCode ?? null,
        userId: p.userId ?? null,
        displayName: p.displayName,
        employmentType: mapEmploymentType(p.employmentType),
        status: "draft",
        departmentId: p.departmentId ?? null,
        designationId: p.designationId ?? null,
        managerEmployeeId: p.managerEmployeeId ?? null,
        hireDate: p.hireDate ?? null,
        terminationDate: null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.employees.save(employee);
      if (!saved.ok) return saved;

      await recordHrAudit(deps.audit, ctx, {
        action: HrPolicyActions.EmployeeCreate,
        entityType: "employee",
        entityId: id,
        outcome: "success",
        details: { displayName: p.displayName },
      });

      return ok({ employeeId: id });
    },
  };
}

export function createGetEmployeeHandler(
  deps: HrHandlerDeps,
): QueryHandler<GetEmployeePayload, GetEmployeeResult> {
  return {
    queryType: HrQueryTypes.GetEmployee,
    async authorize(query) {
      const p = query.payload;
      await loadRecordForAuthorization(() =>
        deps.employees.findById({ companyId: p.companyId, id: p.employeeId }),
      );
      return companyResource(
        "employee",
        HrPolicyActions.EmployeeRead,
        p.companyId,
        p.employeeId,
      );
    },
    validate() {
      return getEmployeeQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const found = await deps.employees.findById({
        companyId: scope.value,
        id: query.payload.employeeId,
      });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Employee not found", {
            code: "employee_not_found",
          }),
        );
      }

      return ok({ employee: found.value });
    },
  };
}

function createEmployeeListCandidateFetcher(
  listByCompany: HrHandlerDeps["employees"]["listByCompany"],
): FetchListCandidates<EmploymentProfile> {
  let prepared: EmploymentProfile[] | null = null;

  return async ({ companyId, offset, limit }) => {
    if (prepared === null) {
      const all: EmploymentProfile[] = [];
      let page = 1;
      for (;;) {
        const batch = await listByCompany(companyId, { page, pageSize: 100 });
        if (!batch.ok) {
          return batch;
        }
        all.push(...batch.value.items);
        if (!batch.value.hasMore) {
          break;
        }
        page += 1;
      }
      prepared = all;
    }

    return ok(prepared.slice(offset, offset + limit));
  };
}

export function createListEmployeeHandler(
  deps: HrHandlerDeps,
): QueryHandler<ListEmployeePayload, Page<EmploymentProfile>> {
  return {
    queryType: HrQueryTypes.ListEmployee,
    authorize(query, ctx) {
      return companyResource(
        "employee",
        HrPolicyActions.EmployeeRead,
        query.payload.companyId,
        null,
        principalListScope(ctx.principal, HrPolicyActions.EmployeeRead),
      );
    },
    validate() {
      return listEmployeeQueryValidator;
    },
    async handle(query, ctx) {
      const scope = requireCompanyId(ctx, query.payload.companyId);
      if (!scope.ok) return scope;

      const request = { ...query.payload, companyId: scope.value };
      return buildAuthorizedListPage<EmploymentProfile>({
        ctx,
        action: HrPolicyActions.EmployeeRead,
        resourceType: "employee",
        request,
        toScope: (employee) => ({
          id: employee.id,
          companyId: employee.companyId,
        }),
        fetchCandidates: createEmployeeListCandidateFetcher((companyId, page) =>
          deps.employees.listByCompany(companyId, page),
        ),
      });
    },
  };
}
