/**
 * RC8.2 — freeze of newly wired enterprise List* CQRS bindings.
 */
import { describe, expect, it } from "vitest";
import { HR_MODULE } from "../hr/definition";
import { MANUFACTURING_MODULE } from "../manufacturing/definition";
import { CMS_MODULE } from "../cms/definition";
import { DAM_MODULE } from "../dam/definition";
import { NOTIFICATIONS_MODULE } from "../notifications/definition";
import { REPORTING_MODULE } from "../reporting/definition";
import { SEARCH_MODULE } from "../search/definition";
import { JOBS_MODULE } from "../jobs/definition";
import type { EntityDef, ModuleDefinition } from "./types";
import { readListPage } from "./list-query";

const EXPECTED: ReadonlyArray<{
  readonly moduleId: string;
  readonly entityKey: string;
  readonly listQueryType: string;
}> = [
  { moduleId: "hr", entityKey: "employees", listQueryType: "hr.ListEmployee" },
  {
    moduleId: "manufacturing",
    entityKey: "production-orders",
    listQueryType: "manufacturing.ListProductionOrder",
  },
  { moduleId: "cms", entityKey: "pages", listQueryType: "cms.ListCmsEntry" },
  { moduleId: "dam", entityKey: "assets", listQueryType: "dam.ListAsset" },
  {
    moduleId: "notifications",
    entityKey: "center",
    listQueryType: "notifications.ListInAppNotifications",
  },
  {
    moduleId: "reporting",
    entityKey: "library",
    listQueryType: "reporting.ListReportDefinition",
  },
  { moduleId: "search", entityKey: "results", listQueryType: "search.SearchQuery" },
  { moduleId: "jobs", entityKey: "queue", listQueryType: "jobs.ListBackgroundJobs" },
];

const MODULES: readonly ModuleDefinition[] = [
  HR_MODULE,
  MANUFACTURING_MODULE,
  CMS_MODULE,
  DAM_MODULE,
  NOTIFICATIONS_MODULE,
  REPORTING_MODULE,
  SEARCH_MODULE,
  JOBS_MODULE,
];

describe("RC8.2 enterprise List* UI bindings", () => {
  it("wires remaining production workspace entities to live listQueryType + mapEntity", () => {
    for (const expected of EXPECTED) {
      const mod = MODULES.find((m) => m.id === expected.moduleId);
      expect(mod, expected.moduleId).toBeTruthy();
      const entity = mod!.entities.find((e: EntityDef) => e.key === expected.entityKey);
      expect(entity, `${expected.moduleId}/${expected.entityKey}`).toBeTruthy();
      expect(entity!.api?.listQueryType).toBe(expected.listQueryType);
      expect(
        entity!.api?.mapListEntity ?? entity!.api?.mapEntity,
        `${expected.moduleId}/${expected.entityKey} mapper`,
      ).toBeTypeOf("function");
    }
  });

  it("jobs module mounts under platform operations path", () => {
    expect(JOBS_MODULE.basePath).toBe("/app/platform/jobs");
  });

  it("readListPage accepts jobs and hits collections", () => {
    expect(readListPage({ jobs: [{ id: "1" }], totalCount: 1 }).items).toHaveLength(1);
    expect(readListPage({ hits: [{ documentId: "d1" }], total: 3 }).totalCount).toBe(3);
  });
});
