/**
 * RC9.2 facade — extends the public consultant API without breaking the shell.
 */

export { initialAssistantMessage, runConsultantTurn } from "./intelligent/engine";
export type { ConsultantState, ConsultantMemory, ConsultantCard, ConsultantAction, ConsultantTurnResult } from "./intelligent/types";
export {
  loadConsultantMemory,
  saveConsultantMemory,
  clearConsultantMemory,
} from "./intelligent/memory";
export {
  getConsultantProvider,
  listConsultantProviders,
  setConsultantProvider,
  getActiveConsultantProviderId,
} from "./intelligent/provider";
export { searchCatalog, recommendFromCatalog, assertGroundedIds } from "./intelligent/grounding";
export { assembleIntelligentPackage } from "./intelligent/packages";
export { buildQuoteQuery, quoteCardFromPackage } from "./intelligent/quote";
export {
  planFromBrief,
  planFromTemplate,
  planFromConsultantMemory,
  estimateQuantities,
} from "./intelligent/planner";
export {
  createDefaultBrief,
  discoveryQuestions,
  TEMPLATE_LABELS,
  briefFromMemory,
} from "./intelligent/space-brief";
export type { SpaceBrief, SpaceTemplateId } from "./intelligent/space-brief";
export { listIndustryTemplates, getIndustryTemplate } from "./intelligent/templates";
export { optimizePackage, buildOptimizedPackages } from "./intelligent/optimize";
export type { OptimizationResult } from "./intelligent/optimize";
export {
  buildPlannerHandoff,
  savePlannerHandoff,
  consumePlannerHandoff,
  peekPlannerHandoff,
  bootstrapConsultantFromPlannerUrl,
} from "./intelligent/handoff";
export type { PlannerHandoffPayload } from "./intelligent/handoff";

import { runConsultantTurn } from "./intelligent/engine";
import type { ConsultantMemory, ConsultantTurnResult } from "./intelligent/types";

/** Back-compat entry — NL + classic answers share the grounded engine. */
export function nextConsultantTurn(
  state: ConsultantMemory,
  userText: string,
): ConsultantTurnResult {
  return runConsultantTurn(state, userText);
}

export const STEPS = [
  "roomType",
  "dimensions",
  "seats",
  "style",
  "budget",
  "preference",
  "recommend",
] as const;
