/**
 * RC10.4 — Document HTML helpers (print / Save as PDF). No accounting integration.
 */

import type { SalesOrder, SalesQuote } from "./types";
import { recordDocument } from "./service";

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
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{border-bottom:1px solid #ddd;padding:.4rem .3rem;text-align:left;font-size:.9rem}
  .muted{color:#666;font-size:.85rem}
  .total{font-weight:700;margin-top:1rem}
  @media print{button{display:none}}
</style></head><body>
${bodyHtml}
<p><button onclick="window.print()">Print / Save as PDF</button></p>
</body></html>`);
  w.document.close();
}

function linesTable(lines: readonly { name: string; qty: number; unitPkr: number; variantLabels?: readonly string[] }[]): string {
  const rows = lines
    .map((l) => {
      const variants = l.variantLabels?.length ? ` <span class="muted">(${escapeHtml(l.variantLabels.join(", "))})</span>` : "";
      return `<tr><td>${escapeHtml(l.name)}${variants}</td><td>${l.qty}</td><td>${l.unitPkr.toLocaleString("en-PK")}</td><td>${(l.qty * l.unitPkr).toLocaleString("en-PK")}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Item</th><th>Qty</th><th>Unit (PKR)</th><th>Line (PKR)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function openQuotationPdf(quote: SalesQuote, customerName: string): void {
  openPrintWindow(
    `Quotation ${quote.label}`,
    `<h1>Quotation — ${escapeHtml(quote.label)}</h1>
     <p class="muted">Revision r${quote.revision} · Status ${quote.status} · ${escapeHtml(customerName)}</p>
     ${linesTable(quote.lines)}
     <p class="total">Total: PKR ${quote.totalPkr.toLocaleString("en-PK")}</p>
     <p class="muted">Rao Liaqat Furniture · Quotation PDF</p>`,
  );
  recordDocument({
    opportunityId: quote.opportunityId,
    kind: "quotation_pdf",
    label: `Quotation PDF — ${quote.label} (r${quote.revision})`,
    relatedQuoteId: quote.id,
  });
}

export function openOrderPdf(order: SalesOrder): void {
  openPrintWindow(
    `Order ${order.id.slice(0, 8)}`,
    `<h1>Sales Order</h1>
     <p class="muted">ID ${escapeHtml(order.id)} · ${escapeHtml(order.customerName)} · ${order.status}</p>
     ${linesTable(order.packageSnapshot)}
     <p>Subtotal: PKR ${order.subtotalPkr.toLocaleString("en-PK")}</p>
     <p>Tax (placeholder): PKR ${order.taxPkr.toLocaleString("en-PK")}</p>
     <p class="total">Total: PKR ${order.totalPkr.toLocaleString("en-PK")}</p>
     <p class="muted">Payment: ${order.paymentStatus} · Delivery: ${order.deliveryStatus}</p>`,
  );
  recordDocument({
    opportunityId: order.opportunityId,
    kind: "order_pdf",
    label: `Order PDF — ${order.id.slice(0, 8)}`,
    relatedOrderId: order.id,
  });
}

export function openInvoicePlaceholder(order: SalesOrder): void {
  openPrintWindow(
    `Invoice placeholder ${order.id.slice(0, 8)}`,
    `<h1>Invoice (Placeholder)</h1>
     <p class="muted">Accounting integration is out of scope for RC10.4.</p>
     <p>Customer: ${escapeHtml(order.customerName)}</p>
     <p>Order: ${escapeHtml(order.id)}</p>
     <p class="total">Amount due: PKR ${order.totalPkr.toLocaleString("en-PK")}</p>`,
  );
  recordDocument({
    opportunityId: order.opportunityId,
    kind: "invoice_placeholder",
    label: `Invoice placeholder — ${order.id.slice(0, 8)}`,
    relatedOrderId: order.id,
  });
}

export function openDeliveryNotePlaceholder(order: SalesOrder): void {
  openPrintWindow(
    `Delivery note ${order.id.slice(0, 8)}`,
    `<h1>Delivery Note (Placeholder)</h1>
     <p class="muted">Ship / logistics systems not integrated in RC10.4.</p>
     <p>Customer: ${escapeHtml(order.customerName)}</p>
     <p>Delivery status: ${order.deliveryStatus}</p>
     ${linesTable(order.packageSnapshot)}`,
  );
  recordDocument({
    opportunityId: order.opportunityId,
    kind: "delivery_note_placeholder",
    label: `Delivery note — ${order.id.slice(0, 8)}`,
    relatedOrderId: order.id,
  });
}
