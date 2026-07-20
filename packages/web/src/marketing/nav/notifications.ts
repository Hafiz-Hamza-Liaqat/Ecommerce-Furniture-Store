/**
 * RC9.4.1 — Marketing notification center (local persistence, API-ready shape).
 */

export type NotificationCategory =
  | "ai_consultant"
  | "budget_planner"
  | "project_saved"
  | "project_shared"
  | "quotation_ready"
  | "crm_lead"
  | "quote_approved"
  | "quote_rejected"
  | "product_updates"
  | "wishlist_price"
  | "stock"
  | "admin_announcement"
  | "system_maintenance"
  | "collaboration"
  | "comments"
  | "version_restored";

export type CxNotification = {
  readonly id: string;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly href?: string;
  readonly read: boolean;
};

const STORAGE_KEY = "afh.cx.notifications";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  ai_consultant: "AI Consultant",
  budget_planner: "Budget Planner",
  project_saved: "Project Saved",
  project_shared: "Project Shared",
  quotation_ready: "Quotation Ready",
  crm_lead: "CRM Lead Created",
  quote_approved: "Quote Approved",
  quote_rejected: "Quote Rejected",
  product_updates: "Product Updates",
  wishlist_price: "Wishlist Price Change",
  stock: "Stock Availability",
  admin_announcement: "Admin Announcements",
  system_maintenance: "System Maintenance",
  collaboration: "Collaboration Requests",
  comments: "Comments",
  version_restored: "Version Restored",
};

export function notificationCategoryLabel(category: NotificationCategory): string {
  return CATEGORY_LABELS[category];
}

function readAll(): CxNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedIfEmpty();
    const parsed = JSON.parse(raw) as CxNotification[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedIfEmpty();
    return parsed;
  } catch {
    return seedIfEmpty();
  }
}

function writeAll(items: readonly CxNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function seedIfEmpty(): CxNotification[] {
  const now = Date.now();
  const seed: CxNotification[] = [
    {
      id: crypto.randomUUID(),
      category: "project_saved",
      title: "Project saved",
      body: "Your furnishing project was saved successfully.",
      createdAt: new Date(now - 12 * 60_000).toISOString(),
      href: "/my-projects",
      read: false,
    },
    {
      id: crypto.randomUUID(),
      category: "ai_consultant",
      title: "AI Consultant update",
      body: "Your office package recommendation is ready to review.",
      createdAt: new Date(now - 3 * 3_600_000).toISOString(),
      href: "/consultant",
      read: false,
    },
    {
      id: crypto.randomUUID(),
      category: "quotation_ready",
      title: "Quotation ready",
      body: "A presentation estimate is ready to convert to a formal quote.",
      createdAt: new Date(now - 26 * 3_600_000).toISOString(),
      href: "/quote",
      read: true,
    },
    {
      id: crypto.randomUUID(),
      category: "collaboration",
      title: "Collaboration request",
      body: "A designer asked to comment on your shared project.",
      createdAt: new Date(now - 3 * 86_400_000).toISOString(),
      href: "/my-projects",
      read: false,
    },
    {
      id: crypto.randomUUID(),
      category: "system_maintenance",
      title: "Scheduled maintenance",
      body: "Brief window Sunday 02:00–03:00 PKT. Planning tools remain available offline.",
      createdAt: new Date(now - 5 * 86_400_000).toISOString(),
      read: true,
    },
  ];
  writeAll(seed);
  return seed;
}

export function listNotifications(): CxNotification[] {
  return [...readAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(): number {
  return readAll().filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllNotificationsRead(): void {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

export function deleteNotification(id: string): void {
  writeAll(readAll().filter((n) => n.id !== id));
}

export function pushNotification(
  input: Omit<CxNotification, "id" | "createdAt" | "read"> & { read?: boolean },
): CxNotification {
  const item: CxNotification = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: input.read ?? false,
    category: input.category,
    title: input.title,
    body: input.body,
    ...(input.href ? { href: input.href } : {}),
  };
  writeAll([item, ...readAll()].slice(0, 100));
  return item;
}

export type NotificationGroup = {
  readonly label: "Today" | "Yesterday" | "Earlier";
  readonly items: readonly CxNotification[];
};

export function groupNotifications(
  items: readonly CxNotification[],
): readonly NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const today: CxNotification[] = [];
  const yesterday: CxNotification[] = [];
  const earlier: CxNotification[] = [];

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= startOfToday.getTime()) today.push(item);
    else if (t >= startOfYesterday.getTime()) yesterday.push(item);
    else earlier.push(item);
  }

  const groups: NotificationGroup[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}
