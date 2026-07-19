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
