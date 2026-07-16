import type { PromptItem } from "./types";

export const SUGGESTED_PROMPTS = [
  "Summarize today’s executive briefing",
  "Explain sales KPI trends this month",
  "Draft a customer follow-up email",
  "Summarize low-stock and aging inventory",
  "Explain cash flow snapshot",
  "Summarize open service tickets and SLA risk",
] as const;

export const PROMPT_LIBRARY: readonly PromptItem[] = [
  { id: "p-sales-1", title: "Quote draft", category: "Sales", body: "Draft a professional quote cover email for the active opportunity." },
  { id: "p-sales-2", title: "Opportunity summary", category: "Sales", body: "Summarize the opportunity stage, value, and next actions." },
  { id: "p-sales-3", title: "Meeting follow-up", category: "Sales", body: "Write a meeting summary with follow-ups." },
  { id: "p-fin-1", title: "Invoice summary", category: "Finance", body: "Summarize the selected invoice and payment status." },
  { id: "p-fin-2", title: "Cash explanation", category: "Finance", body: "Explain the cash flow snapshot without posting entries." },
  { id: "p-hr-1", title: "Leave summary", category: "HR", body: "Summarize open leave requests and attendance highlights." },
  { id: "p-proc-1", title: "Supplier summary", category: "Procurement", body: "Summarize supplier performance and late deliveries." },
  { id: "p-proc-2", title: "RFQ draft", category: "Procurement", body: "Draft an RFQ for the selected purchase request." },
  { id: "p-inv-1", title: "Warehouse insight", category: "Inventory", body: "Explain warehouse utilization and slow movers." },
  { id: "p-crm-1", title: "Lead summary", category: "CRM", body: "Summarize the lead and recommended next touch." },
  { id: "p-crm-2", title: "Campaign summary", category: "CRM", body: "Summarize campaign performance signals." },
  { id: "p-mfg-1", title: "Yield explanation", category: "Manufacturing", body: "Explain production yield and scrap from analytics." },
  { id: "p-svc-1", title: "Ticket summary", category: "Service", body: "Summarize the ticket, SLA status, and customer history." },
  { id: "p-cms-1", title: "Announcement draft", category: "CMS", body: "Draft an internal announcement from the provided outline." },
  { id: "p-proj-1", title: "Project risk summary", category: "Projects", body: "Summarize project risks and milestone variance." },
];

export const KNOWLEDGE_DOCS = [
  { id: "k1", title: "Quality SOP — Finish inspection", href: "/app/cms", tags: ["SOP", "Quality"] },
  { id: "k2", title: "Procurement policy — Vendor onboarding", href: "/app/cms", tags: ["Policy", "Procurement"] },
  { id: "k3", title: "HR FAQ — Leave entitlements", href: "/app/hr", tags: ["FAQ", "HR"] },
  { id: "k4", title: "Service manual — On-site visit checklist", href: "/app/dam", tags: ["Manual", "Service"] },
  { id: "k5", title: "Safety policy — Factory floor", href: "/app/cms", tags: ["Policy", "Manufacturing"] },
  { id: "k6", title: "Help — Workspace shortcuts", href: "/app/preferences", tags: ["Help", "Workspace"] },
] as const;

export const MODULE_ASSIST_HINTS: Record<string, string[]> = {
  sales: ["Draft quote email", "Summarize opportunity", "Suggest follow-ups"],
  procurement: ["Supplier summary", "Draft RFQ", "Vendor comparison summary"],
  inventory: ["Explain low stock", "Aging summary", "Warehouse insight"],
  finance: ["Explain cash snapshot", "Invoice summary", "Expense summary"],
  crm: ["Lead summary", "Account summary", "Campaign summary"],
  projects: ["Project summary", "Milestone summary", "Risk summary"],
  service: ["Ticket summary", "Work-order summary", "Customer history"],
  manufacturing: ["Yield explanation", "Capacity summary", "Downtime summary"],
  analytics: ["Explain KPIs", "Weekly briefing", "Highlight risks"],
  reports: ["Summarize this report", "Executive takeaways", "Export checklist"],
};

export const SEARCH_HITS = [
  { id: "h1", title: "SO-31001", type: "Order", module: "Sales", href: "/app/sales", score: 0.96, summary: "Confirmed order — Marina finish package." },
  { id: "h2", title: "Indus HQ fit-out", type: "Project", module: "Projects", href: "/app/projects", score: 0.93, summary: "Active project with milestone reviews this week." },
  { id: "h3", title: "Meridian Sofa frame", type: "Item", module: "Inventory", href: "/app/inventory", score: 0.88, summary: "SKU with elevated movement and low free stock." },
  { id: "h4", title: "SR-441", type: "Ticket", module: "Service", href: "/app/service", score: 0.86, summary: "Escalated service ticket near SLA breach." },
  { id: "h5", title: "Company scorecard", type: "Report", module: "Reports", href: "/app/reports/executive", score: 0.84, summary: "Executive report pack for July." },
] as const;

export const WRITING_TEMPLATES = [
  { id: "w1", label: "Sales email", kind: "email" },
  { id: "w2", label: "Proposal outline", kind: "proposal" },
  { id: "w3", label: "RFQ draft", kind: "rfq" },
  { id: "w4", label: "Quote cover", kind: "quote" },
  { id: "w5", label: "Blog draft", kind: "blog" },
  { id: "w6", label: "Announcement", kind: "announcement" },
  { id: "w7", label: "Marketing copy", kind: "marketing" },
  { id: "w8", label: "Documentation", kind: "docs" },
] as const;
