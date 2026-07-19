/**
 * RC9.3 — Shared intelligent planner entry (Consultant + Budget Planner).
 */

import type { FurniturePackage } from "../budget-planner";
import {
  briefFromMemory,
  createDefaultBrief,
  type SpaceBrief,
  type SpaceTemplateId,
} from "./space-brief";
import {
  buildOptimizedPackages,
  type OptimizationResult,
} from "./optimize";
import { getIndustryTemplate } from "./templates";
import type { ConsultantMemory } from "./types";
import { toEndUse } from "./nlu";

export type IntelligentPlan = {
  readonly brief: SpaceBrief;
  readonly packages: readonly FurniturePackage[];
  readonly results: readonly OptimizationResult[];
  readonly primary: FurniturePackage;
  readonly primaryResult: OptimizationResult;
};

export function planFromBrief(brief: SpaceBrief): IntelligentPlan {
  const { packages, results, primary, primaryResult } = buildOptimizedPackages(brief);
  return { brief, packages, results, primary, primaryResult };
}

export function planFromTemplate(
  templateId: SpaceTemplateId,
  overrides: Partial<SpaceBrief> = {},
): IntelligentPlan {
  const base = createDefaultBrief(templateId);
  return planFromBrief({
    ...base,
    ...overrides,
    templateId,
    flags: { ...base.flags, ...(overrides.flags ?? {}) },
  });
}

export function planFromConsultantMemory(memory: ConsultantMemory): IntelligentPlan {
  const endUse = toEndUse(memory);
  const templateId =
    memory.spaceTemplateId &&
    ["office", "home", "hotel", "restaurant", "cafe", "school", "university", "hospital", "clinic", "coworking", "retail", "jahez", "government"].includes(
      memory.spaceTemplateId,
    )
      ? (memory.spaceTemplateId as SpaceTemplateId)
      : memory.industry && /jahez|wedding/.test(memory.industry)
        ? ("jahez" as const)
        : memory.roomType === "jahez"
          ? ("jahez" as const)
          : undefined;

  const brief = briefFromMemory({
    endUse,
    ...(memory.industry ? { industry: memory.industry } : {}),
    ...(memory.seats != null ? { seats: memory.seats } : {}),
    ...(memory.employeeCount != null ? { employeeCount: memory.employeeCount } : {}),
    ...(memory.budgetPkr != null ? { budgetPkr: memory.budgetPkr } : {}),
    ...(memory.style ? { style: memory.style } : {}),
    ...(memory.widthM != null ? { widthM: memory.widthM } : {}),
    ...(memory.depthM != null ? { depthM: memory.depthM } : {}),
    ...(templateId ? { templateId } : {}),
  });

  const enriched: SpaceBrief = {
    ...brief,
    ...(memory.managers != null ? { managers: memory.managers } : {}),
    ...(memory.executiveCabins != null ? { executiveCabins: memory.executiveCabins } : {}),
    ...(memory.bedrooms != null ? { bedrooms: memory.bedrooms } : {}),
    flags: { ...brief.flags, ...(memory.spaceFlags ?? {}) },
  };

  return planFromBrief(enriched);
}

export function estimateQuantities(brief: SpaceBrief): readonly {
  readonly role: string;
  readonly zone: string;
  readonly qty: number;
}[] {
  const template = getIndustryTemplate(brief.templateId);
  return template.roles
    .map((r) => ({ role: r.role, zone: r.zone, qty: r.qty(brief) }))
    .filter((r) => r.qty > 0);
}
