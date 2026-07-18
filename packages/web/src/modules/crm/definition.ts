import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["New", "Open", "Qualified", "Converted", "Closed"] },
  { key: "owner", label: "Owner" },
  { key: "source", label: "Source", options: ["Inbound", "Outbound", "Partner", "Event"] },
  { key: "segment", label: "Segment", options: ["Enterprise", "Hospitality", "Residential"] },
  { key: "date", label: "Date" },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"] },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

const accounts = makeRows(
  "ACC",
  ["Indus Group", "Marina Hospitality", "Cedar Club", "Horizon Hotels", "Studio Kite"],
  (i) => ({
    Type: i % 2 ? "Enterprise" : "Hospitality",
    Owner: i % 2 ? "A. Khan" : "S. Malik",
    Region: ["North", "South", "Central"][i % 3]!,
  }),
);

export const CRM_MODULE: ModuleDefinition = {
  id: "crm",
  title: "CRM",
  lead: "Leads, contacts, accounts, and campaigns via CRM Application APIs.",
  basePath: "/app/crm",
  summaryQueryType: "crm.GetCrmSummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Open leads", value: "96", trend: 5.2, href: "leads" },
    { label: "Accounts", value: "412", trend: 1.8, href: "accounts" },
    { label: "Activities due", value: "38", trend: -2.0, href: "activities" },
    { label: "Campaign reach", value: "12.4k", trend: 8.0, href: "campaigns" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "leads", label: "Leads", entityKey: "leads" },
    { to: "contacts", label: "Contacts", entityKey: "contacts" },
    { to: "accounts", label: "Accounts", entityKey: "accounts" },
    { to: "opportunities", label: "Opportunities", entityKey: "opportunities" },
    { to: "activities", label: "Activities", entityKey: "activities" },
    { to: "calls", label: "Calls", entityKey: "calls" },
    { to: "meetings", label: "Meetings", entityKey: "meetings" },
    { to: "emails", label: "Emails", entityKey: "emails" },
    { to: "campaigns", label: "Campaigns", entityKey: "campaigns" },
    { to: "pipeline", label: "Pipeline" },
    { to: "calendar", label: "Calendar" },
    { to: "timeline", label: "Customer timeline", entityKey: "timeline" },
    { to: "scoring", label: "Lead scoring", entityKey: "scoring" },
    { to: "segments", label: "Segmentation", entityKey: "segments" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "leads",
      label: "Lead",
      plural: "Leads",
      description: "Inbound and outbound leads.",
      kanban: true,
      columns: [
        { key: "title", label: "Lead", sortable: true },
        { key: "status", label: "Status" },
        { key: "Source", label: "Source" },
        { key: "Owner", label: "Owner" },
        { key: "Score", label: "Score" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "code", label: "Code", type: "text" },
        { name: "sourceName", label: "Source", type: "text" },
        { name: "classification", label: "Classification", type: "select", options: ["hot", "warm", "cold", "partner", "other"] },
      ],
      records: makeRows("LD", ["Lobby refresh inquiry", "Showroom walk-in", "Partner referral", "Web form — dining"], (i) => ({
        Source: ["Inbound", "Event", "Partner", "Inbound"][i]!,
        Owner: i % 2 ? "A. Khan" : "S. Malik",
        Score: 55 + i * 10,
      })),
      api: {
        createCommandType: "crm.CreateLead",
        updateCommandType: "crm.UpdateLead",
        getQueryType: "crm.GetLead",
        listQueryType: "crm.ListLead",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          title: v.title,
          code: v.code || null,
          sourceName: v.sourceName || null,
          classification: v.classification || null,
        }),
        buildUpdatePayload: (companyId, leadId, v) => ({
          companyId,
          leadId,
          title: v.title || null,
          code: v.code || null,
          sourceName: v.sourceName || null,
          classification: v.classification || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, leadId: id }),
        extractCreateId: (data) => (data as { leadId?: string }).leadId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; title?: string; status?: string; code?: string };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.code ?? d.id, d.status ?? "New", {}, { source: "api" });
        },
        lifecycleActions: [
          {
            id: "qualify",
            label: "Qualify lead",
            commandType: "crm.QualifyLead",
            buildPayload: (companyId, leadId) => ({
              companyId,
              leadId,
              requireApproval: false,
            }),
          },
          {
            id: "convert",
            label: "Convert lead",
            commandType: "crm.ConvertLead",
            tone: "primary",
            buildPayload: (companyId, leadId) => ({
              companyId,
              leadId,
              requireApproval: true,
            }),
          },
        ],
      },
    }),
    e({
      key: "contacts",
      label: "Contact",
      plural: "Contacts",
      description: "People associated with accounts and leads.",
      columns: [
        { key: "title", label: "Contact", sortable: true },
        { key: "status", label: "Status" },
        { key: "Email", label: "Email" },
        { key: "Account", label: "Account" },
      ],
      fields: [
        { name: "displayName", label: "Display name", type: "text", required: true },
        { name: "email", label: "Email", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "accountId", label: "Account ID", type: "text" },
      ],
      records: makeRows("CT", ["Sara Ahmed", "Bilal Hussain", "Elena Rossi", "James Okonkwo"], (i) => ({
        Email: `contact${i}@example.com`,
        Account: accounts[i % accounts.length]!.title,
      })),
      api: {
        createCommandType: "crm.CreateContact",
        getQueryType: "crm.GetContact",
        listQueryType: "crm.ListContact",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          displayName: v.displayName,
          email: v.email || null,
          phone: v.phone || null,
          accountId: v.accountId || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, contactId: id }),
        extractCreateId: (data) => (data as { contactId?: string }).contactId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; displayName?: string; status?: string; email?: string };
          if (!d.id) return null;
          return row(d.id, d.displayName ?? d.id, d.status ?? "Active", { Email: d.email ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "accounts",
      label: "Account",
      plural: "Accounts",
      description: "Customer and prospect accounts.",
      columns: [
        { key: "title", label: "Account", sortable: true },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "code", label: "Code", type: "text" },
        { name: "accountType", label: "Type", type: "select", options: ["customer", "prospect", "partner", "other"] },
      ],
      records: accounts,
      api: {
        createCommandType: "crm.CreateAccount",
        getQueryType: "crm.GetAccount",
        listQueryType: "crm.ListAccount",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          name: v.name,
          code: v.code || null,
          accountType: v.accountType || "prospect",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, accountId: id }),
        extractCreateId: (data) => (data as { accountId?: string }).accountId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; status?: string; accountType?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Active", { Type: d.accountType ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "opportunities",
      label: "Opportunity",
      plural: "Opportunities",
      description: "CRM opportunities linked to accounts.",
      columns: [
        { key: "title", label: "Opportunity" },
        { key: "status", label: "Stage" },
        { key: "Account", label: "Account" },
        { key: "amount", label: "Value" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "account", label: "Account", type: "text" },
      ],
      records: makeRows("COPP", ["Workspace refresh", "Lobby seating", "Guest-room package"], (i) => ({
        Account: accounts[i % accounts.length]!.title,
      })),
    }),
    e({
      key: "activities",
      label: "Activity",
      plural: "Activities",
      description: "Logged CRM activities.",
      columns: [
        { key: "title", label: "Activity" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "subject", label: "Subject", type: "text", required: true },
        { name: "activityType", label: "Type", type: "select", options: ["call", "meeting", "email", "task", "note", "visit", "other"], required: true },
        { name: "leadId", label: "Lead ID", type: "text" },
      ],
      records: makeRows("ACT", ["Discovery call", "Proposal follow-up", "Site walk"], (i) => ({
        Type: ["Call", "Email", "Meeting"][i]!,
        Owner: "A. Khan",
      })),
      api: {
        createCommandType: "crm.LogActivity",
        getQueryType: "crm.GetActivity",
        listQueryType: "crm.ListActivity",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          subject: v.subject,
          activityType: v.activityType || "task",
          leadId: v.leadId || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, activityId: id }),
        extractCreateId: (data) => (data as { activityId?: string }).activityId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; subject?: string; status?: string; activityType?: string };
          if (!d.id) return null;
          return row(d.id, d.subject ?? d.id, d.status ?? "Open", { Type: d.activityType ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "calls",
      label: "Call",
      plural: "Calls",
      description: "Call log.",
      columns: [
        { key: "title", label: "Call" },
        { key: "status", label: "Status" },
        { key: "Contact", label: "Contact" },
        { key: "Duration", label: "Duration" },
      ],
      fields: [
        { name: "title", label: "Subject", type: "text", required: true },
        { name: "contact", label: "Contact", type: "text" },
      ],
      records: makeRows("CALL", ["Intro call", "Pricing clarification"], (i) => ({
        Contact: ["Sara Ahmed", "Bilal Hussain"][i]!,
        Duration: `${8 + i * 4}m`,
      })),
    }),
    e({
      key: "meetings",
      label: "Meeting",
      plural: "Meetings",
      description: "Scheduled meetings.",
      columns: [
        { key: "title", label: "Meeting" },
        { key: "status", label: "Status" },
        { key: "When", label: "When" },
        { key: "Account", label: "Account" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "when", label: "When", type: "date" },
      ],
      records: makeRows("MTG", ["Design review", "Kickoff"], (i) => ({
        When: `2026-07-${15 + i}`,
        Account: accounts[i % accounts.length]!.title,
      })),
    }),
    e({
      key: "emails",
      label: "Email",
      plural: "Emails",
      description: "Logged email communications.",
      columns: [
        { key: "title", label: "Subject" },
        { key: "status", label: "Status" },
        { key: "Direction", label: "Direction" },
      ],
      fields: [
        { name: "subject", label: "Subject", type: "text", required: true },
        { name: "channel", label: "Channel", type: "select", options: ["email", "sms", "whatsapp", "call", "in_app", "other"] },
      ],
      records: makeRows("EML", ["Quote attached", "Thanks for visiting"], (i) => ({
        Direction: i ? "Outbound" : "Inbound",
      })),
      api: {
        createCommandType: "crm.RecordCommunication",
        getQueryType: "crm.GetCommunication",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          subject: v.subject,
          channel: v.channel || "email",
          direction: "outbound",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, communicationId: id }),
        extractCreateId: (data) => (data as { communicationId?: string }).communicationId ?? null,
      },
    }),
    e({
      key: "campaigns",
      label: "Campaign",
      plural: "Campaigns",
      description: "Marketing and outreach campaigns.",
      columns: [
        { key: "title", label: "Campaign" },
        { key: "status", label: "Status" },
        { key: "Channel", label: "Channel" },
        { key: "Reach", label: "Reach" },
      ],
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "code", label: "Code", type: "text" },
      ],
      records: makeRows("CMP", ["Atelier launch", "Hospitality Q3", "Factory open day"], (i) => ({
        Channel: ["Email", "Event", "Social"][i]!,
        Reach: 2000 + i * 1500,
      })),
      api: {
        createCommandType: "crm.CreateCampaign",
        getQueryType: "crm.GetCampaign",
        listQueryType: "crm.ListCampaign",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          name: v.name,
          code: v.code || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, campaignId: id }),
        extractCreateId: (data) => (data as { campaignId?: string }).campaignId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; status?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Draft", {}, { source: "api" });
        },
      },
    }),
    e({
      key: "timeline",
      label: "Timeline event",
      plural: "Customer timeline",
      description: "Unified customer interaction timeline.",
      columns: [
        { key: "title", label: "Event" },
        { key: "status", label: "When" },
        { key: "Account", label: "Account" },
      ],
      fields: [{ name: "title", label: "Event", type: "text", required: true }],
      records: makeRows("CTL", ["Lead created", "Meeting held", "Quote sent"], (i) => ({
        Account: accounts[i % accounts.length]!.title,
      })),
    }),
    e({
      key: "scoring",
      label: "Score model",
      plural: "Lead scoring",
      description: "Lead scoring presentation (rules evaluated server-side).",
      analytics: true,
      columns: [
        { key: "title", label: "Lead" },
        { key: "status", label: "Band" },
        { key: "Score", label: "Score" },
      ],
      fields: [{ name: "title", label: "Lead", type: "text", required: true }],
      records: makeRows("SCR", ["Lobby refresh inquiry", "Partner referral"], (i) => ({
        Score: 70 + i * 12,
      })),
    }),
    e({
      key: "segments",
      label: "Segment",
      plural: "Segmentation",
      description: "Audience segments.",
      columns: [
        { key: "title", label: "Segment" },
        { key: "status", label: "Status" },
        { key: "Size", label: "Size" },
      ],
      fields: [{ name: "title", label: "Segment", type: "text", required: true }],
      records: makeRows("SEG", ["Hospitality North", "Enterprise Punjab", "Export prospects"], (i) => ({
        Size: 40 + i * 25,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "CRM analytics",
      description: "CRM analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("CAN", ["Conversion rate", "Pipeline velocity", "Campaign CTR"], (i) => ({
        Value: ["18%", "22d", "3.4%"][i]!,
      })),
    }),
  ],
};
