import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

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
  lead: "In-app notification center via Notifications Application CQRS; templates remain presentation chrome.",
  basePath: "/app/notifications",
  kpis: [
    { label: "Inbox", value: "Live", trend: 0, href: "center" },
    { label: "Sent (7d)", value: "—", trend: 5.0, href: "history" },
    { label: "Failed", value: "—", trend: -2.0, href: "delivery" },
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
      api: {
        getQueryType: "notifications.GetNotification",
        listQueryType: "notifications.ListInAppNotifications",
        buildGetPayload: (companyId, id) => ({ companyId, notificationId: id }),
        mapEntity: (data) => {
          const wrapped = data as { notification?: Record<string, unknown> };
          const d = (wrapped.notification ?? data) as {
            id?: string;
            title?: string;
            subject?: string;
            status?: string;
            channel?: string;
            createdAt?: string;
            readAt?: string | null;
          };
          if (!d.id) return null;
          return row(
            d.id,
            d.title ?? d.subject ?? d.id,
            d.readAt ? "Read" : (d.status ?? "Unread"),
            {
              Channel: d.channel ?? "in_app",
              When: d.createdAt ?? "—",
            },
            { source: "api" },
          );
        },
      },
    }),
    e({
      key: "preferences",
      label: "Preference",
      plural: "User preferences",
      description: "Notification channel preferences (upsert via CQRS).",
      columns: [
        { key: "title", label: "Channel" },
        { key: "status", label: "Status" },
        { key: "Enabled", label: "Enabled" },
      ],
      fields: [
        {
          name: "channel",
          label: "Channel",
          type: "select",
          required: true,
          options: ["email", "sms", "whatsapp", "push", "in_app", "other"],
        },
        {
          name: "enabled",
          label: "Enabled",
          type: "select",
          options: ["true", "false"],
        },
      ],
      records: makeRows("NP", ["email", "in_app", "push"], (i) => ({
        Enabled: i === 1 ? "No" : "Yes",
      })),
      api: {
        createCommandType: "notifications.UpsertNotificationPreference",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          channel: v.channel || "in_app",
          enabled: v.enabled !== "false",
        }),
        extractCreateId: (data) => (data as { preferenceId?: string }).preferenceId ?? null,
        mapEntity: (data) => {
          const d = data as { preferenceId?: string; id?: string; channel?: string; enabled?: boolean };
          const id = d.preferenceId ?? d.id ?? d.channel;
          if (!id) return null;
          return row(String(id), d.channel ?? String(id), d.enabled === false ? "Disabled" : "Enabled", {
            Enabled: d.enabled === false ? "No" : "Yes",
          }, { source: "api" });
        },
      },
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
