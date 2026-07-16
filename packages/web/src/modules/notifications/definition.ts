import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Queued", "Sent", "Failed", "Scheduled"] },
  { key: "channel", label: "Channel", options: ["Email", "SMS", "Push", "In-app"] },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const NOTIFICATIONS_MODULE: ModuleDefinition = {
  id: "notifications",
  title: "Notifications",
  lead: "Notification center and templates — delivery transport remains backend Notifications.",
  basePath: "/app/notifications",
  kpis: [
    { label: "Unread", value: "8", trend: 0, href: "center" },
    { label: "Sent (7d)", value: "1,240", trend: 5.0, href: "history" },
    { label: "Failed", value: "6", trend: -2.0, href: "delivery" },
    { label: "Templates", value: "42", trend: 1.0, href: "email-templates" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "center", label: "Notification center", entityKey: "center" },
    { to: "email-templates", label: "Email templates", entityKey: "email-templates" },
    { to: "sms-templates", label: "SMS templates", entityKey: "sms-templates" },
    { to: "push-templates", label: "Push templates", entityKey: "push-templates" },
    { to: "history", label: "Campaign history", entityKey: "history" },
    { to: "delivery", label: "Delivery status", entityKey: "delivery" },
    { to: "preferences", label: "User preferences", entityKey: "preferences" },
    { to: "scheduling", label: "Scheduling", entityKey: "scheduling" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "center",
      label: "Notification",
      plural: "Notification center",
      description: "User notification inbox.",
      columns: [
        { key: "title", label: "Notification" },
        { key: "status", label: "Status" },
        { key: "Channel", label: "Channel" },
        { key: "When", label: "When" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "channel", label: "Channel", type: "select", options: ["Email", "SMS", "Push", "In-app"] },
      ],
      records: makeRows("NTF", ["3 approvals await", "SR-441 escalated", "Weekly capacity ready", "Catalogue export done"], (i) => ({
        Channel: ["In-app", "Email", "Email", "In-app"][i]!,
        When: ["10m", "45m", "Today", "Yesterday"][i]!,
      })),
    }),
    e({
      key: "email-templates",
      label: "Email template",
      plural: "Email templates",
      description: "Email notification templates.",
      columns: [
        { key: "title", label: "Template" },
        { key: "status", label: "Status" },
        { key: "Locale", label: "Locale" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "locale", label: "Locale", type: "text" },
      ],
      records: makeRows("EMT", ["Approval requested", "Order confirmed", "Password reset"], () => ({
        Locale: "en",
      })),
    }),
    e({
      key: "sms-templates",
      label: "SMS template",
      plural: "SMS templates",
      description: "SMS templates.",
      columns: [
        { key: "title", label: "Template" },
        { key: "status", label: "Status" },
        { key: "Length", label: "Chars" },
      ],
      fields: [{ name: "title", label: "Name", type: "text", required: true }],
      records: makeRows("SMT", ["OTP", "Appointment reminder"], (i) => ({
        Length: i ? 120 : 80,
      })),
    }),
    e({
      key: "push-templates",
      label: "Push template",
      plural: "Push templates",
      description: "Push notification templates.",
      columns: [
        { key: "title", label: "Template" },
        { key: "status", label: "Status" },
        { key: "Platform", label: "Platform" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "platform", label: "Platform", type: "select", options: ["iOS", "Android", "Web"] },
      ],
      records: makeRows("PHT", ["Mention", "Task due"], (i) => ({
        Platform: i ? "Web" : "Android",
      })),
    }),
    e({
      key: "history",
      label: "Campaign",
      plural: "Campaign history",
      description: "Notification campaign history.",
      columns: [
        { key: "title", label: "Campaign" },
        { key: "status", label: "Status" },
        { key: "Sent", label: "Sent" },
      ],
      fields: [{ name: "title", label: "Campaign", type: "text", required: true }],
      records: makeRows("NCH", ["July digest", "Open factory invite"], (i) => ({
        Sent: 400 + i * 200,
      })),
    }),
    e({
      key: "delivery",
      label: "Delivery",
      plural: "Delivery status",
      description: "Per-message delivery status.",
      columns: [
        { key: "title", label: "Message" },
        { key: "status", label: "Status" },
        { key: "Channel", label: "Channel" },
      ],
      fields: [
        { name: "title", label: "Message", type: "text", required: true },
        { name: "channel", label: "Channel", type: "select", options: ["Email", "SMS", "Push"] },
      ],
      records: makeRows("NDL", ["Approval email", "SMS OTP", "Push mention"], (i) => ({
        Channel: ["Email", "SMS", "Push"][i]!,
      })),
    }),
    e({
      key: "preferences",
      label: "Preference",
      plural: "User preferences",
      description: "Per-user notification preferences.",
      columns: [
        { key: "title", label: "User" },
        { key: "status", label: "Status" },
        { key: "Email", label: "Email" },
        { key: "Push", label: "Push" },
      ],
      fields: [
        { name: "title", label: "User", type: "text", required: true },
        { name: "email", label: "Email", type: "select", options: ["On", "Off"] },
      ],
      records: makeRows("PRF", ["admin@afh.local", "ops@afh.local"], (i) => ({
        Email: "On",
        Push: i ? "Off" : "On",
      })),
    }),
    e({
      key: "scheduling",
      label: "Schedule",
      plural: "Scheduling",
      description: "Scheduled notification jobs.",
      columns: [
        { key: "title", label: "Job" },
        { key: "status", label: "Status" },
        { key: "Next", label: "Next run" },
      ],
      fields: [
        { name: "title", label: "Job", type: "text", required: true },
        { name: "next", label: "Next run", type: "date" },
      ],
      records: makeRows("NSC", ["Weekly digest", "SLA warning sweep"], (i) => ({
        Next: `2026-07-${18 + i}`,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Notification analytics",
      description: "Notification analytics.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("NAN", ["Open rate", "Click rate", "Failure rate"], (i) => ({
        Value: ["42%", "8%", "0.5%"][i]!,
      })),
    }),
  ],
};
