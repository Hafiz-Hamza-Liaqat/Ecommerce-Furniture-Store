/** Presentation fixtures for BI — values align to Reporting snapshots; no client calculation engine. */

export type KpiDef = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly trend?: number;
  readonly target?: string;
  readonly previous?: string;
  readonly href: string;
  readonly hint?: string;
};

export type ModuleKpiPack = {
  readonly id: string;
  readonly title: string;
  readonly modulePath: string;
  readonly summaryQueryType?: string;
  readonly kpis: readonly KpiDef[];
  readonly series: readonly number[];
  readonly seriesLabel: string;
};

export const PERIOD_SUMMARIES = [
  { id: "daily", label: "Daily executive briefing", body: "Orders steady · 3 approvals pending · SR-441 escalated · Cash healthy." },
  { id: "weekly", label: "Weekly summary", body: "Revenue +4.2% WoW · Production yield 96% · Pipeline coverage 2.1×." },
  { id: "monthly", label: "Monthly summary", body: "Bookings ₨ 18.4M · Gross margin 34% · Inventory turns 4.1 · SLA 97%." },
  { id: "quarterly", label: "Quarterly summary", body: "Q2 growth 11% · Capex within plan · NPS improving · Capacity utilization 78%." },
  { id: "annual", label: "Annual summary", body: "FY trajectory on plan · New accounts +19% · Warehouse network expansion underway." },
] as const;

export const DEPT_PERFORMANCE = [
  { name: "Sales", score: 86, href: "/app/sales" },
  { name: "Procurement", score: 78, href: "/app/procurement" },
  { name: "Inventory", score: 72, href: "/app/inventory" },
  { name: "Manufacturing", score: 81, href: "/app/manufacturing" },
  { name: "Finance", score: 88, href: "/app/finance" },
  { name: "CRM", score: 74, href: "/app/crm" },
  { name: "Projects", score: 69, href: "/app/projects" },
  { name: "Service", score: 83, href: "/app/service" },
  { name: "HR", score: 77, href: "/app/hr" },
] as const;

export const MODULE_KPI_PACKS: readonly ModuleKpiPack[] = [
  {
    id: "sales",
    title: "Sales",
    modulePath: "/app/sales",
    series: [42, 48, 51, 49, 55, 58, 61, 59, 64, 68, 71, 74],
    seriesLabel: "Revenue index",
    kpis: [
      { id: "rev", label: "Revenue", value: "₨ 18.4M", trend: 4.2, previous: "₨ 17.6M", target: "₨ 19.0M", href: "/app/sales/orders" },
      { id: "ord", label: "Orders", value: "312", trend: 2.1, href: "/app/sales/orders" },
      { id: "qte", label: "Quotations", value: "148", trend: -1.4, href: "/app/sales/quotes" },
      { id: "conv", label: "Conversion rate", value: "28%", trend: 1.0, href: "/app/sales" },
      { id: "growth", label: "Sales growth", value: "+11% YoY", trend: 11, href: "/app/sales" },
      { id: "cust", label: "Customer growth", value: "+19%", trend: 3.2, href: "/app/crm/accounts" },
      { id: "terr", label: "Territory performance", value: "North 92", trend: 2.0, href: "/app/sales" },
    ],
  },
  {
    id: "procurement",
    title: "Procurement",
    modulePath: "/app/procurement",
    summaryQueryType: "procurement.GetProcurementSummary",
    series: [30, 32, 28, 35, 33, 36, 40, 38, 42, 41, 44, 46],
    seriesLabel: "Purchase volume",
    kpis: [
      { id: "vol", label: "Purchase volume", value: "₨ 6.2M", trend: 3.0, href: "/app/procurement/orders" },
      { id: "sup", label: "Supplier performance", value: "84", trend: 1.5, href: "/app/procurement/suppliers" },
      { id: "lead", label: "Lead time", value: "9.4d", trend: -0.6, href: "/app/procurement" },
      { id: "cost", label: "Procurement cost", value: "₨ 410k", trend: -2.0, href: "/app/procurement" },
      { id: "score", label: "Vendor score", value: "4.2/5", trend: 0.2, href: "/app/procurement/suppliers" },
      { id: "late", label: "Late deliveries", value: "7%", trend: -1.1, href: "/app/procurement/receipts" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    modulePath: "/app/inventory",
    summaryQueryType: "inventory.GetInventorySummary",
    series: [70, 68, 72, 69, 66, 64, 67, 65, 63, 62, 60, 61],
    seriesLabel: "Stock valuation index",
    kpis: [
      { id: "val", label: "Stock valuation", value: "₨ 42M", trend: -1.2, href: "/app/inventory/items" },
      { id: "turn", label: "Turnover", value: "4.1×", trend: 0.3, href: "/app/inventory" },
      { id: "age", label: "Inventory aging", value: "18% >90d", trend: -0.8, href: "/app/inventory/items" },
      { id: "fast", label: "Fast-moving items", value: "126 SKUs", href: "/app/inventory/items" },
      { id: "slow", label: "Slow-moving items", value: "48 SKUs", href: "/app/inventory/items" },
      { id: "dead", label: "Dead stock", value: "12 SKUs", href: "/app/inventory/items" },
      { id: "wh", label: "Warehouse utilization", value: "78%", trend: 2.0, href: "/app/inventory/warehouses" },
    ],
  },
  {
    id: "manufacturing",
    title: "Manufacturing",
    modulePath: "/app/manufacturing",
    series: [75, 78, 74, 80, 82, 79, 84, 83, 85, 81, 86, 88],
    seriesLabel: "Efficiency index",
    kpis: [
      { id: "eff", label: "Production efficiency", value: "88%", trend: 1.4, href: "/app/manufacturing" },
      { id: "mach", label: "Machine utilization", value: "76%", trend: 0.8, href: "/app/manufacturing/machines" },
      { id: "down", label: "Downtime", value: "4.2%", trend: -0.5, href: "/app/manufacturing/maintenance" },
      { id: "yield", label: "Yield", value: "96%", trend: 0.4, href: "/app/manufacturing/quality" },
      { id: "scrap", label: "Scrap", value: "1.8%", trend: -0.2, href: "/app/manufacturing/quality" },
      { id: "cap", label: "Capacity", value: "82%", href: "/app/manufacturing/capacity" },
      { id: "oee", label: "OEE placeholder", value: "—", hint: "Shown when production metrics exist", href: "/app/manufacturing" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    modulePath: "/app/finance",
    summaryQueryType: "finance.GetFinancialSummary",
    series: [50, 52, 55, 53, 58, 60, 62, 61, 65, 67, 70, 72],
    seriesLabel: "Cash & profit index",
    kpis: [
      { id: "cash", label: "Cash flow", value: "₨ 4.8M", trend: 2.5, href: "/app/finance" },
      { id: "profit", label: "Profit", value: "₨ 3.1M", trend: 3.0, href: "/app/finance" },
      { id: "exp", label: "Expenses", value: "₨ 9.2M", trend: 1.1, href: "/app/finance/expenses" },
      { id: "var", label: "Budget variance", value: "-2.4%", trend: 0.6, href: "/app/finance/budgets" },
      { id: "rev", label: "Revenue", value: "₨ 18.4M", trend: 4.2, href: "/app/finance" },
      { id: "assets", label: "Assets", value: "₨ 128M", href: "/app/finance" },
      { id: "liab", label: "Liabilities", value: "₨ 41M", href: "/app/finance" },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    modulePath: "/app/crm",
    summaryQueryType: "crm.GetCrmSummary",
    series: [20, 24, 28, 26, 30, 34, 32, 36, 40, 38, 42, 45],
    seriesLabel: "Pipeline index",
    kpis: [
      { id: "leads", label: "Leads", value: "214", trend: 5.0, href: "/app/crm/leads" },
      { id: "conv", label: "Conversion", value: "22%", trend: 1.2, href: "/app/crm" },
      { id: "pipe", label: "Pipeline", value: "₨ 52M", trend: 3.5, href: "/app/crm/pipeline" },
      { id: "camp", label: "Campaign performance", value: "3.4% CTR", href: "/app/crm/campaigns" },
      { id: "acq", label: "Customer acquisition", value: "38", trend: 2.0, href: "/app/crm/accounts" },
      { id: "clv", label: "CLV placeholder", value: "—", hint: "Awaiting lifetime value snapshots", href: "/app/crm" },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    modulePath: "/app/projects",
    summaryQueryType: "projects.GetProjectSummary",
    series: [60, 62, 65, 64, 68, 70, 72, 71, 74, 76, 75, 78],
    seriesLabel: "Completion index",
    kpis: [
      { id: "comp", label: "Completion", value: "68%", trend: 2.0, href: "/app/projects" },
      { id: "bud", label: "Budget utilization", value: "74%", href: "/app/projects/budgets" },
      { id: "time", label: "Timeline variance", value: "+6d", trend: -1.0, href: "/app/projects/milestones" },
      { id: "res", label: "Resource utilization", value: "81%", href: "/app/projects/resources" },
    ],
  },
  {
    id: "service",
    title: "Service",
    modulePath: "/app/service",
    summaryQueryType: "service.GetServiceSummary",
    series: [90, 91, 89, 92, 93, 94, 92, 95, 96, 95, 97, 97],
    seriesLabel: "SLA compliance",
    kpis: [
      { id: "sla", label: "SLA compliance", value: "97%", trend: 0.5, href: "/app/service" },
      { id: "tech", label: "Technician utilization", value: "84%", href: "/app/service/scheduling" },
      { id: "fr", label: "First response", value: "1.4h", trend: -0.2, href: "/app/service/tickets" },
      { id: "res", label: "Resolution time", value: "18h", trend: -1.0, href: "/app/service/tickets" },
      { id: "csat", label: "Customer satisfaction", value: "4.6/5", trend: 0.1, href: "/app/service" },
    ],
  },
  {
    id: "hr",
    title: "HR",
    modulePath: "/app/hr",
    series: [95, 94, 96, 95, 97, 96, 95, 94, 96, 97, 98, 97],
    seriesLabel: "Attendance",
    kpis: [
      { id: "att", label: "Attendance", value: "97%", href: "/app/hr/attendance" },
      { id: "hc", label: "Headcount", value: "186", trend: 1.0, href: "/app/hr/employees" },
      { id: "leave", label: "Leave", value: "12 open", href: "/app/hr/leave" },
      { id: "turn", label: "Turnover", value: "6.2%", trend: -0.4, href: "/app/hr" },
      { id: "perf", label: "Performance distribution", value: "Top 18%", href: "/app/hr/performance" },
    ],
  },
  {
    id: "cms",
    title: "CMS",
    modulePath: "/app/cms",
    series: [10, 12, 11, 14, 16, 15, 18, 20, 19, 22, 24, 25],
    seriesLabel: "Content views index",
    kpis: [
      { id: "views", label: "Content views", value: "48.2k", trend: 6.0, href: "/app/cms/pages" },
      { id: "eng", label: "Engagement", value: "3.8%", href: "/app/cms" },
      { id: "pub", label: "Publishing activity", value: "27", href: "/app/cms/articles" },
    ],
  },
  {
    id: "dam",
    title: "DAM",
    modulePath: "/app/dam",
    series: [40, 42, 45, 44, 48, 50, 52, 51, 55, 58, 60, 62],
    seriesLabel: "Storage usage",
    kpis: [
      { id: "stor", label: "Storage usage", value: "1.2 TB", trend: 4.0, href: "/app/dam" },
      { id: "dl", label: "Downloads", value: "1,840", href: "/app/dam" },
      { id: "use", label: "Asset usage", value: "62%", href: "/app/dam" },
      { id: "appr", label: "Asset approval", value: "14 pending", href: "/app/dam" },
    ],
  },
];

export type ReportDef = {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly href: string;
  readonly description: string;
  readonly favorite?: boolean;
};

export const REPORT_CATALOG: readonly ReportDef[] = [
  { id: "r-exec", title: "Company scorecard", domain: "Executive", href: "/app/reports/executive", description: "Leadership health and performance pack." },
  { id: "r-ops", title: "Operational daily", domain: "Operational", href: "/app/reports/operational", description: "Orders, capacity, service queue." },
  { id: "r-sales", title: "Bookings by region", domain: "Sales", href: "/app/reports/sales", description: "Territory and conversion analysis." },
  { id: "r-inv", title: "Inventory aging", domain: "Inventory", href: "/app/reports/inventory", description: "Fast, slow, and dead stock." },
  { id: "r-mfg", title: "Production yield", domain: "Manufacturing", href: "/app/reports/manufacturing", description: "Efficiency, scrap, capacity." },
  { id: "r-proc", title: "Supplier scorecard", domain: "Procurement", href: "/app/reports/procurement", description: "Lead time and late deliveries." },
  { id: "r-fin", title: "Cash & P&L", domain: "Finance", href: "/app/reports/finance", description: "Cash flow, profit, budget variance." },
  { id: "r-crm", title: "Pipeline coverage", domain: "CRM", href: "/app/reports/crm", description: "Leads, campaigns, acquisition." },
  { id: "r-proj", title: "Project portfolio", domain: "Projects", href: "/app/reports/projects", description: "Completion and budget utilization." },
  { id: "r-svc", title: "SLA & CSAT", domain: "Service", href: "/app/reports/service", description: "Response, resolution, satisfaction." },
  { id: "r-hr", title: "People analytics", domain: "HR", href: "/app/reports/hr", description: "Attendance, headcount, turnover." },
  { id: "r-cms", title: "Content performance", domain: "CMS", href: "/app/reports/cms", description: "Views and publishing activity." },
  { id: "r-dam", title: "Asset utilization", domain: "DAM", href: "/app/reports/dam", description: "Storage, downloads, approvals." },
];

export const INSIGHTS = [
  { id: "i1", kind: "highlight", title: "Revenue above weekly plan", body: "Bookings tracking +4.2% vs prior week across North and Central." },
  { id: "i2", kind: "opportunity", title: "CRM pipeline coverage strong", body: "Coverage at 2.1× — prioritize Indus HQ and Horizon Hotels closes." },
  { id: "i3", kind: "risk", title: "Slow-moving inventory rising", body: "48 SKUs aging — review replenishment and promotions." },
  { id: "i4", kind: "trend", title: "Service SLA stable at 97%", body: "First response improving; watch SR-441 escalation." },
  { id: "i5", kind: "recommendation", title: "Recommendation placeholder", body: "AI recommendations reserved for Phase P7 — use Reporting snapshots today." },
  { id: "i6", kind: "summary", title: "Executive summary", body: "Company health solid; manufacturing yield high; finance cash positive." },
] as const;

export const COMPARISONS = [
  { id: "c1", label: "Current vs Previous", current: "₨ 18.4M", previous: "₨ 17.6M", delta: "+4.5%" },
  { id: "c2", label: "Current vs Target", current: "₨ 18.4M", previous: "₨ 19.0M", delta: "-3.2%" },
  { id: "c3", label: "Branch vs Branch", current: "Lahore 92", previous: "Karachi 84", delta: "+8 pts" },
  { id: "c4", label: "Warehouse vs Warehouse", current: "WH-A 78%", previous: "WH-B 71%", delta: "+7 pts" },
  { id: "c5", label: "Month vs Month", current: "Jul 74", previous: "Jun 71", delta: "+4.2%" },
  { id: "c6", label: "Year vs Year", current: "FY26 11%", previous: "FY25 7%", delta: "+4 pts" },
  { id: "c7", label: "Department vs Department", current: "Finance 88", previous: "Projects 69", delta: "+19 pts" },
  { id: "c8", label: "Region vs Region", current: "North 92", previous: "South 81", delta: "+11 pts" },
] as const;

export const FORECAST_SERIES = {
  available: false as boolean,
  values: [] as number[],
  label: "Forecast (API)",
};

export const BUILDER_WIDGETS = [
  { id: "kpi-strip", label: "KPI strip", kind: "kpis" },
  { id: "revenue-line", label: "Revenue line", kind: "line" },
  { id: "orders-bar", label: "Orders bar", kind: "bar" },
  { id: "pipeline-funnel", label: "Pipeline funnel", kind: "funnel" },
  { id: "dept-radar", label: "Department radar", kind: "radar" },
  { id: "mix-donut", label: "Revenue mix donut", kind: "donut" },
  { id: "compare", label: "Comparison cards", kind: "compare" },
  { id: "heatmap", label: "Ops heatmap", kind: "heatmap" },
  { id: "map", label: "Geo map", kind: "map" },
  { id: "gauge", label: "Health gauge", kind: "gauge" },
] as const;

export const REPORT_TABLE_ROWS = [
  ["REX-01", "Company scorecard", "Ready", "2026-07"],
  ["RSA-12", "Bookings by region", "Ready", "2026-07"],
  ["RIN-08", "Inventory aging", "Draft", "2026-07"],
  ["RFN-03", "Cash & P&L", "Ready", "2026-07"],
  ["RSV-05", "SLA & CSAT", "Scheduled", "2026-07"],
  ["RHR-02", "People analytics", "Ready", "2026-06"],
  ["RMF-07", "Production yield", "Ready", "2026-07"],
  ["RCR-04", "Pipeline coverage", "Ready", "2026-07"],
] as const;
