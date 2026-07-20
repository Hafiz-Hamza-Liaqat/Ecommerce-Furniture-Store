import type {
  AiChatChunk,
  AiCitation,
  AiContext,
  AiProvider,
  AiProviderId,
} from "./types";
import { BRAND } from "../brand";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function citationsFor(ctx?: AiContext): AiCitation[] {
  const list: AiCitation[] = [];
  if (ctx?.recordHref && ctx.recordLabel) {
    list.push({
      id: "rec",
      title: ctx.recordLabel,
      href: ctx.recordHref,
      module: ctx.module ?? "Record",
    });
  }
  if (ctx?.project) {
    list.push({ id: "proj", title: ctx.project, href: "/app/projects", module: "Projects" });
  }
  if (ctx?.order) {
    list.push({ id: "ord", title: ctx.order, href: "/app/sales", module: "Sales" });
  }
  if (ctx?.customer) {
    list.push({ id: "cust", title: ctx.customer, href: "/app/crm", module: "CRM" });
  }
  if (ctx?.warehouse) {
    list.push({ id: "wh", title: ctx.warehouse, href: "/app/inventory", module: "Inventory" });
  }
  if (ctx?.report) {
    list.push({ id: "rep", title: ctx.report, href: "/app/reports", module: "Reports" });
  }
  if (ctx?.dashboard) {
    list.push({ id: "dash", title: ctx.dashboard, href: "/app/analytics", module: "Analytics" });
  }
  if (list.length === 0) {
    list.push(
      { id: "exec", title: "Executive dashboard", href: "/app", module: "Workspace" },
      { id: "an", title: "Analytics center", href: "/app/analytics", module: "Analytics" },
    );
  }
  return list;
}

function craftReply(userText: string, ctx?: AiContext): string {
  const q = userText.toLowerCase();
  const where = ctx?.module ? `**${ctx.module}**` : "the current workspace";
  const focus = [
    ctx?.customer && `Customer: ${ctx.customer}`,
    ctx?.order && `Order: ${ctx.order}`,
    ctx?.project && `Project: ${ctx.project}`,
    ctx?.warehouse && `Warehouse: ${ctx.warehouse}`,
    ctx?.report && `Report: ${ctx.report}`,
    ctx?.dashboard && `Dashboard: ${ctx.dashboard}`,
    ctx?.recordLabel && `Record: ${ctx.recordLabel}`,
  ]
    .filter(Boolean)
    .join(" · ");

  let body =
    `I am the ${BRAND.name} enterprise assistant assisting in ${where}. ` +
    `I explain existing ERP, analytics, and search data — I do not change workflows, policies, or calculations.\n\n`;

  if (focus) body += `**Context**\n${focus}\n\n`;

  if (/kpi|trend|analytics|scorecard|brief/.test(q)) {
    body +=
      `**Executive briefing**\n` +
      `- Revenue tracking above prior week on presentation snapshots.\n` +
      `- Watch inventory aging and SR escalations in Service.\n` +
      `- Open Analytics → drill into module KPI centers for source lists.\n\n` +
      `| Area | Signal |\n| --- | --- |\n| Sales | Bookings healthy |\n| Service | SLA ~97% |\n| Inventory | Slow movers rising |\n`;
  } else if (/quote|sales|opportunity|email|follow/.test(q)) {
    body +=
      `**Sales assist**\n` +
      `Draft outline (edit before send):\n\n` +
      `> Thank you for considering ${BRAND.name}. Based on your project requirements, we propose a phased delivery with finish samples in week 1 and installation readiness in week 6.\n\n` +
      `**Follow-ups**\n1. Confirm finish palette\n2. Share site access window\n3. Schedule design review\n`;
  } else if (/supplier|procurement|rfq|vendor/.test(q)) {
    body +=
      `**Procurement assist**\n` +
      `- Summarize vendor scorecards from Procurement module lists.\n` +
      `- RFQ draft placeholder: scope, quantity, delivery SLA, quality specs.\n` +
      `- Recommendation placeholders only — purchasing decisions stay human + policy.\n`;
  } else if (/inventory|stock|warehouse|overstock|low.?stock/.test(q)) {
    body +=
      `**Inventory assist**\n` +
      `- Explain aging / low-stock signals from Inventory analytics fixtures.\n` +
      `- No forecasting engine — use existing turns and utilization KPIs.\n` +
      `- Drill to /app/inventory for SKU detail.\n`;
  } else if (/invoice|cash|finance|expense|budget/.test(q)) {
    body +=
      `**Finance assist**\n` +
      `- Explain cash / P&L presentation snapshots only.\n` +
      `- No journal posting or accounting rules in the assistant.\n` +
      `- Cite Finance reports and live summary payloads when available.\n`;
  } else if (/lead|crm|campaign|account|meeting/.test(q)) {
    body +=
      `**CRM assist**\n` +
      `- Lead/account/campaign summaries from CRM lists and pipeline views.\n` +
      `- Meeting notes outline: attendees, decisions, next actions.\n`;
  } else if (/project|milestone|risk|team/.test(q)) {
    body +=
      `**Project assist**\n` +
      `- Portfolio / milestone / risk summaries from Projects module.\n` +
      `- Point to Gantt/Kanban for schedule context.\n`;
  } else if (/ticket|service|work.?order|technician/.test(q)) {
    body +=
      `**Service assist**\n` +
      `- Ticket and work-order summaries; SLA signals from Service analytics.\n` +
      `- Customer history via Service module detail pages.\n`;
  } else if (/policy|sop|manual|faq|help|knowledge/.test(q)) {
    body +=
      `**Knowledge**\n` +
      `- Search company policy / SOP / FAQ catalogue (presentation library).\n` +
      `- Always verify against the authoritative document in CMS/DAM.\n`;
  } else if (/ocr|invoice extract|document|pdf|contract/.test(q)) {
    body +=
      `**Document intelligence**\n` +
      `- Upload UI stages files for backend extraction contracts.\n` +
      `- Browser shows extraction placeholders only — no OCR engine here.\n`;
  } else {
    body +=
      `**Suggested next steps**\n` +
      `1. Ask for a module summary (Sales, Finance, Inventory, …)\n` +
      `2. Open related records from the citation panel\n` +
      `3. Use Writing Studio for drafts or Prompt Library for reusable asks\n`;
  }

  body += `\n_Provider-agnostic response · domain mutations remain on Application APIs._`;
  return body;
}

async function* streamText(
  text: string,
  citations: readonly AiCitation[],
  signal?: AbortSignal,
  temperature = 0.4,
): AsyncIterable<AiChatChunk> {
  const delay = Math.max(8, 28 - temperature * 20);
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await sleep(delay, signal);
    yield { delta: part };
  }
  yield { delta: "", done: true, citations };
}

function makeVendorStub(id: AiProviderId, label: string, models: readonly string[]): AiProvider {
  return {
    id,
    label,
    models,
    async *chatStream(req) {
      // Presentation stub: same assist path until backend AI commands stream via API.
      const last = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const text =
        `[${label} · ${req.model}]\n\n` + craftReply(last, req.context);
      yield* streamText(text, citationsFor(req.context), req.signal, req.temperature);
    },
  };
}

export const LOCAL_PROVIDER: AiProvider = {
  id: "local",
  label: `${BRAND.monogram} Local Assist`,
  models: ["afh-assist-1"],
  async *chatStream(req) {
    const last = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    yield* streamText(craftReply(last, req.context), citationsFor(req.context), req.signal, req.temperature);
  },
};

export const PROVIDERS: readonly AiProvider[] = [
  LOCAL_PROVIDER,
  makeVendorStub("openai", "OpenAI", ["gpt-4.1", "gpt-4.1-mini"]),
  makeVendorStub("anthropic", "Anthropic", ["claude-sonnet", "claude-haiku"]),
  makeVendorStub("gemini", "Google Gemini", ["gemini-2.0-flash", "gemini-1.5-pro"]),
  makeVendorStub("azure-openai", "Azure OpenAI", ["gpt-4o", "gpt-4o-mini"]),
];

export function getProvider(id: AiProviderId): AiProvider {
  return PROVIDERS.find((p) => p.id === id) ?? LOCAL_PROVIDER;
}
