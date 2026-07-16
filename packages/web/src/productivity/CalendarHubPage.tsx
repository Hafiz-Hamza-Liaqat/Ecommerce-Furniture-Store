import { useMemo, useState } from "react";
import { PageHeader } from "../components/ui";
import { Tabs } from "../workspace/widgets";
import { EnterpriseCalendar, type CalendarEvent } from "./EnterpriseCalendar";
import { useWorkspaceUi } from "../workspace/context";

const LANES = [
  { id: "personal", label: "Personal" },
  { id: "team", label: "Team" },
  { id: "project", label: "Projects" },
  { id: "service", label: "Service" },
  { id: "mfg", label: "Manufacturing" },
  { id: "leave", label: "Leave" },
  { id: "approvals", label: "Approvals" },
] as const;

function seedEvents(): CalendarEvent[] {
  const today = new Date().getDate();
  return [
    { id: "e1", title: "Ops standup", day: today, lane: "personal", href: "/app/me", tone: "ok" },
    { id: "e2", title: "Design review", day: Math.min(28, today + 1), lane: "project", href: "/app/projects", tone: "warn" },
    { id: "e3", title: "SR-441 site visit", day: Math.min(28, today + 2), lane: "service", href: "/app/service", tone: "danger" },
    { id: "e4", title: "CNC nest run", day: Math.min(28, today + 3), lane: "mfg", href: "/app/manufacturing", tone: "neutral" },
    { id: "e5", title: "Team planning", day: Math.max(1, today - 1), lane: "team", href: "/app/me", tone: "ok" },
    { id: "e6", title: "Leave — Ayesha", day: Math.min(28, today + 4), lane: "leave", href: "/app/hr", tone: "neutral" },
    { id: "e7", title: "Capex approval due", day: Math.min(28, today + 1), lane: "approvals", href: "/app/approvals", tone: "warn" },
    { id: "e8", title: "Factory walk", day: Math.min(28, today + 5), lane: "mfg", href: "/app/manufacturing", tone: "ok" },
    { id: "e9", title: "Vendor call", day: Math.max(1, today - 2), lane: "team", href: "/app/procurement", tone: "neutral" },
    { id: "e10", title: "Milestone: Indus HQ", day: Math.min(28, today + 6), lane: "project", href: "/app/projects", tone: "ok" },
  ];
}

export function CalendarHubPage() {
  const { toast } = useWorkspaceUi();
  const [tab, setTab] = useState("all");
  const events = useMemo(() => seedEvents(), []);

  const filtered =
    tab === "all" ? events : events.filter((e) => e.lane === tab);

  return (
    <div className="stack">
      <PageHeader
        title="Enterprise calendar"
        lead="Unified personal, team, project, service, manufacturing, leave, and approval calendars — UI scheduling only where backend support is absent."
      />
      <Tabs
        tabs={[
          { id: "all", label: "All" },
          ...LANES.map((l) => ({ id: l.id, label: l.label })),
        ]}
        active={tab}
        onChange={setTab}
      />
      <EnterpriseCalendar
        title={tab === "all" ? "Unified calendar" : LANES.find((l) => l.id === tab)?.label ?? "Calendar"}
        lead="Month, week, and day views with drag-and-drop rescheduling (presentation)."
        events={filtered}
        lanes={[...LANES]}
        onMove={(id, day) =>
          toast({
            tone: "info",
            title: "Schedule updated locally",
            body: `Event ${id} moved to day ${day}. Persist via module APIs when available.`,
          })
        }
      />
    </div>
  );
}
