import { useMemo, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";

export type CalendarEvent = {
  readonly id: string;
  readonly title: string;
  readonly day: number;
  readonly lane: string;
  readonly href?: string;
  readonly tone?: "ok" | "warn" | "danger" | "neutral";
};

export type CalendarView = "month" | "week" | "day";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startOffset(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function EnterpriseCalendar({
  title,
  lead,
  events,
  lanes,
  onMove,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly events: readonly CalendarEvent[];
  readonly lanes?: readonly { id: string; label: string }[];
  readonly onMove?: (id: string, day: number) => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [laneFilter, setLaneFilter] = useState("all");
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => [...events]);

  const dim = daysInMonth(year, month);
  const offset = startOffset(year, month);

  const filtered = useMemo(
    () => localEvents.filter((e) => (laneFilter === "all" ? true : e.lane === laneFilter)),
    [localEvents, laneFilter],
  );

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function moveEvent(id: string, day: number) {
    setLocalEvents((prev) => prev.map((e) => (e.id === id ? { ...e, day } : e)));
    onMove?.(id, day);
  }

  function onDropDay(day: number, e: DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/calendar-event");
    if (id) moveEvent(id, day);
  }

  const cells = Array.from({ length: offset + dim }, (_, i) => {
    if (i < offset) return null;
    return i - offset + 1;
  });

  const weekStart = Math.max(1, selectedDay - ((selectedDay + offset - 1) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = weekStart + i;
    return d <= dim ? d : null;
  });

  const dayEvents = filtered.filter((e) => e.day === selectedDay);
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="ws-card p5-cal">
      <header className="ws-card__head p5-cal__head">
        <div>
          <h2>{title}</h2>
          {lead ? <p className="p5-muted">{lead}</p> : null}
        </div>
        <div className="p5-cal__controls">
          <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong>{monthLabel}</strong>
          <button type="button" className="btn btn--ghost" onClick={() => shiftMonth(1)} aria-label="Next month">
            ›
          </button>
          <div className="p5-seg" role="group" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? "is-active" : undefined}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {v[0]!.toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {lanes?.length ? (
            <select
              aria-label="Calendar lane"
              value={laneFilter}
              onChange={(e) => setLaneFilter(e.target.value)}
            >
              <option value="all">All calendars</option>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </header>

      <div className="ws-card__body">
        {view === "month" ? (
          <div className="p5-cal__grid" role="grid" aria-label={monthLabel}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="p5-cal__dow" role="columnheader">
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day == null ? (
                <div key={`e-${i}`} className="p5-cal__cell is-empty" />
              ) : (
                <div
                  key={day}
                  className={`p5-cal__cell${day === selectedDay ? " is-selected" : ""}${day === now.getDate() && month === now.getMonth() && year === now.getFullYear() ? " is-today" : ""}`}
                  role="gridcell"
                  tabIndex={0}
                  onClick={() => setSelectedDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDay(day);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropDay(day, e)}
                >
                  <span className="p5-cal__daynum">{day}</span>
                  <ul className="p5-cal__events">
                    {filtered
                      .filter((ev) => ev.day === day)
                      .slice(0, 3)
                      .map((ev) => (
                        <li key={ev.id}>
                          <button
                            type="button"
                            className={`p5-cal__chip p5-cal__chip--${ev.tone ?? "neutral"}`}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/calendar-event", ev.id)}
                            title={ev.title}
                          >
                            {ev.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        ) : null}

        {view === "week" ? (
          <div className="p5-cal__week">
            {weekDays.map((day, i) => (
              <div
                key={WEEKDAYS[i]}
                className="p5-cal__week-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => day != null && onDropDay(day, e)}
              >
                <strong>
                  {WEEKDAYS[i]} {day ?? "—"}
                </strong>
                <ul>
                  {day != null
                    ? filtered
                        .filter((ev) => ev.day === day)
                        .map((ev) => (
                          <li key={ev.id}>
                            <button
                              type="button"
                              className={`p5-cal__chip p5-cal__chip--${ev.tone ?? "neutral"}`}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/calendar-event", ev.id)}
                            >
                              {ev.title}
                            </button>
                          </li>
                        ))
                    : null}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {view === "day" ? (
          <div className="p5-cal__day">
            <h3>
              {monthLabel} · Day {selectedDay}
            </h3>
            {dayEvents.length === 0 ? (
              <p className="p5-muted">No events. Drag from month/week or create in source modules.</p>
            ) : (
              <ul className="ws-feed">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>
                    <strong>{ev.title}</strong>
                    <span>{ev.lane}</span>
                    {ev.href ? (
                      <Link className="btn btn--ghost" to={ev.href}>
                        Open
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <p className="p5-muted p5-cal__hint">
          Drag chips between days for UI-only rescheduling when backend schedule commands are unavailable.
        </p>
      </div>
    </section>
  );
}
