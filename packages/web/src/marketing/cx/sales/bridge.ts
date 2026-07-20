/**
 * RC10.4 — Bridges existing CX lead queue + project quotes into the sales workspace.
 * Does not alter furnishing project persistence shape.
 */

import type { LeadDraft } from "../stores";
import type { FurnishingProject, ProjectQuote } from "../projects/types";
import {
  createInquiry,
  createQuoteRevision,
  findOpportunityForLead,
  findOpportunityForProject,
} from "./service";
import type { PackageLineSnapshot, SalesOpportunity, SalesQuote } from "./types";

function linesFromProjectQuote(quote: ProjectQuote): PackageLineSnapshot[] {
  return quote.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitPkr: l.unitPkr,
  }));
}

function projectBudget(project: FurnishingProject): number | undefined {
  const room = project.rooms.find((r) => r.id === project.activeRoomId) ?? project.rooms[0];
  const budget = room?.brief && "budgetPkr" in room.brief ? Number(room.brief.budgetPkr) : NaN;
  return Number.isFinite(budget) && budget > 0 ? budget : undefined;
}

/**
 * After `enqueueLead`, ensure a CRM opportunity exists for the inquiry.
 */
export function bridgeLeadToSales(lead: LeadDraft): SalesOpportunity {
  const existing = findOpportunityForLead(lead.id);
  if (existing) return existing;

  const meta = lead.meta ?? {};
  const projectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
  const projectTitle = typeof meta.projectTitle === "string" ? meta.projectTitle : undefined;
  const budgetPkr = typeof meta.budgetPkr === "number" ? meta.budgetPkr : undefined;
  const packageTotalPkr =
    typeof meta.quotationTotal === "number"
      ? meta.quotationTotal
      : typeof meta.totalPkr === "number"
        ? meta.totalPkr
        : undefined;

  if (projectId) {
    const byProject = findOpportunityForProject(projectId);
    if (byProject) return byProject;
  }

  return createInquiry({
    customerName: lead.name,
    customerEmail: lead.email,
    source: lead.source || lead.intent || "inquiry",
    leadDraftId: lead.id,
    ...(projectId ? { projectId } : {}),
    ...(projectTitle ? { projectTitle } : {}),
    ...(budgetPkr != null ? { budgetPkr } : {}),
    ...(packageTotalPkr != null ? { packageTotalPkr } : {}),
    message: lead.message,
  });
}

/**
 * After `recordQuote` on a furnishing project, append an immutable sales quote revision.
 */
export function bridgeProjectQuoteToSales(
  project: FurnishingProject,
  quote: ProjectQuote,
): SalesQuote | null {
  let opportunity = findOpportunityForProject(project.id);
  if (!opportunity) {
    const budget = projectBudget(project);
    opportunity = createInquiry({
      customerName: project.customerName || project.ownerLabel || "Customer",
      customerEmail: `${project.ownerId}@local.cx`,
      source: "budget-planner",
      projectId: project.id,
      projectTitle: project.title,
      ...(budget != null ? { budgetPkr: budget } : {}),
      packageTotalPkr: quote.totalPkr,
      message: `Quote ${quote.label} from planner project “${project.title}”.`,
    });
  }

  return createQuoteRevision({
    opportunityId: opportunity.id,
    projectId: project.id,
    projectQuoteId: quote.id,
    label: quote.label,
    lines: linesFromProjectQuote(quote),
    totalPkr: quote.totalPkr,
    status: "draft",
  });
}
