/**
 * RC10.6 — Export helpers (CSV + print-to-PDF). No Excel integration.
 */

import type { BiReport } from "./types";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, mime: string, body: string): void {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBiReportCsv(report: BiReport): void {
  const rows: string[][] = [
    ["Section", "Metric", "Value"],
    ...report.executive.kpis.map((k) => ["Executive", k.label, k.value]),
    ["Sales", "Quotation acceptance %", String(report.sales.quotationAcceptanceRate)],
    ["Sales", "Avg approval hours", String(report.sales.averageApprovalHours ?? "")],
    ["CRM", "Lead conversion %", String(report.crm.leadConversionRate)],
    ["CRM", "Won", String(report.crm.wonCount)],
    ["CRM", "Lost", String(report.crm.lostCount)],
    ["Production", "In production", String(report.production.inProduction)],
    ["Production", "Backlog", String(report.production.backlog)],
    ["Customers", "New", String(report.customers.newCustomers)],
    ["Customers", "Returning", String(report.customers.returningCustomers)],
    ["Customers", "Avg spend PKR", String(report.customers.averageSpendPkr)],
    ["Planner", "Avg room budget PKR", String(report.planner.averageRoomBudgetPkr)],
    ...report.sales.revenueBySalesperson.map((r) => [
      "Sales revenue by rep",
      r.name,
      String(r.valuePkr),
    ]),
    ...report.crm.stageDistribution.map((r) => ["CRM stage", r.name, String(r.value)]),
    ...report.planner.styleDistribution.map((r) => ["Planner style", r.name, String(r.value)]),
  ];
  const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  downloadBlob(`cx-bi-report-${Date.now()}.csv`, "text/csv;charset=utf-8", csv);
}

export function exportBiReportPdf(report: BiReport): void {
  const kpiRows = report.executive.kpis
    .map((k) => `<tr><td>${escapeHtml(k.label)}</td><td>${escapeHtml(k.value)}</td></tr>`)
    .join("");
  const stageRows = report.crm.stageDistribution
    .map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.value}</td></tr>`)
    .join("");
  openPrintWindow(
    "CX Workspace Intelligence",
    `<h1>Workspace Intelligence Report</h1>
     <p class="muted">Generated ${escapeHtml(report.generatedAt)}</p>
     <h2>Executive KPIs</h2>
     <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${kpiRows}</tbody></table>
     <h2>Pipeline</h2>
     <table><thead><tr><th>Stage</th><th>Count</th></tr></thead><tbody>${stageRows}</tbody></table>
     <p class="muted">Acceptance ${report.sales.quotationAcceptanceRate}% · Production backlog ${report.production.backlog}</p>`,
  );
}

export function printBiDashboard(): void {
  window.print();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openPrintWindow(title: string, bodyHtml: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  body{font-family:Georgia,serif;margin:2rem;color:#1a1a1a}
  h1{font-size:1.4rem;margin:0 0 .5rem}
  h2{font-size:1.1rem;margin:1.5rem 0 .5rem}
  table{width:100%;border-collapse:collapse;margin-top:.5rem}
  th,td{border-bottom:1px solid #ddd;padding:.4rem .3rem;text-align:left;font-size:.9rem}
  .muted{color:#666;font-size:.85rem}
  @media print{button{display:none}}
</style></head><body>
${bodyHtml}
<p><button onclick="window.print()">Print / Save as PDF</button></p>
</body></html>`);
  w.document.close();
}
