/** SVG chart primitives — presentation only, no calculation engine. */

export function LineChart({
  values,
  labels,
  label,
  color = "var(--afh-teal)",
}: {
  readonly values: readonly number[];
  readonly labels?: readonly string[];
  readonly label: string;
  readonly color?: string;
}) {
  const w = 320;
  const h = 140;
  const pad = 12;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `${pad},${h - pad} ${pts.join(" ")} ${w - pad},${h - pad}`;

  return (
    <svg className="ws-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`g-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#g-${label.replace(/\s/g, "")})`} points={area} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.join(" ")}
      />
      {labels ? (
        <text x={pad} y={h - 2} className="ws-chart__axis">
          {labels[0]} — {labels[labels.length - 1]}
        </text>
      ) : null}
    </svg>
  );
}

export function AreaChart({
  values,
  label,
  color = "var(--afh-teal)",
}: {
  readonly values: readonly number[];
  readonly label: string;
  readonly color?: string;
}) {
  return <LineChart values={values} label={label} color={color} />;
}

export function BarChart({
  values,
  labels,
  label,
  color = "var(--afh-copper)",
}: {
  readonly values: readonly number[];
  readonly labels?: readonly string[];
  readonly label: string;
  readonly color?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="ws-bars" role="img" aria-label={label}>
      {values.map((v, i) => (
        <div key={labels?.[i] ?? i} className="ws-bars__col">
          <div className="ws-bars__track">
            <div
              className="ws-bars__fill"
              style={{ height: `${(v / max) * 100}%`, background: color }}
            />
          </div>
          {labels?.[i] ? <span>{labels[i]}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function HorizontalBarChart({
  items,
  label,
  color = "var(--afh-teal)",
}: {
  readonly items: readonly { name: string; value: number }[];
  readonly label: string;
  readonly color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="bi-hbar" role="img" aria-label={label}>
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <div className="bi-hbar__track">
            <div style={{ width: `${(item.value / max) * 100}%`, background: color }}>
              {item.value}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StackedBarChart({
  series,
  labels,
  label,
}: {
  readonly series: readonly { name: string; values: readonly number[]; color: string }[];
  readonly labels: readonly string[];
  readonly label: string;
}) {
  const totals = labels.map((_, i) => series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div className="bi-stacked" role="img" aria-label={label}>
      {labels.map((l, i) => (
        <div key={l} className="bi-stacked__col">
          <div className="bi-stacked__track">
            {series.map((ser) => {
              const v = ser.values[i] ?? 0;
              return (
                <div
                  key={ser.name}
                  style={{ height: `${(v / max) * 100}%`, background: ser.color }}
                  title={`${ser.name}: ${v}`}
                />
              );
            })}
          </div>
          <span>{l}</span>
        </div>
      ))}
      <ul className="bi-legend">
        {series.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PieChart({
  slices,
  label,
  donut = false,
}: {
  readonly slices: readonly { name: string; value: number; color: string }[];
  readonly label: string;
  readonly donut?: boolean;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 54;
  const cx = 70;
  const cy = 70;
  let angle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      ...slice,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });
  return (
    <div className="bi-pie" role="img" aria-label={label}>
      <svg viewBox="0 0 140 140">
        {paths.map((p) => (
          <path key={p.name} d={p.d} fill={p.color} />
        ))}
        {donut ? <circle cx={cx} cy={cy} r={28} fill="var(--afh-paper)" /> : null}
      </svg>
      <ul className="bi-legend">
        {slices.map((s) => (
          <li key={s.name}>
            <i style={{ background: s.color }} />
            {s.name} ({s.value})
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DonutChart(props: {
  readonly slices: readonly { name: string; value: number; color: string }[];
  readonly label: string;
}) {
  return <PieChart {...props} donut />;
}

export function RadarChart({
  axes,
  values,
  label,
  color = "var(--afh-teal)",
}: {
  readonly axes: readonly string[];
  readonly values: readonly number[];
  readonly label: string;
  readonly color?: string;
}) {
  const n = axes.length;
  const cx = 80;
  const cy = 80;
  const r = 58;
  const pts = values.map((v, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = (Math.min(100, Math.max(0, v)) / 100) * r;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  });
  const ring = axes.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return (
    <svg className="ws-chart bi-radar" viewBox="0 0 160 160" role="img" aria-label={label}>
      <polygon fill="none" stroke="var(--afh-border)" points={ring.join(" ")} />
      <polygon fill={color} fillOpacity="0.25" stroke={color} points={pts.join(" ")} />
      {axes.map((ax, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return (
          <text
            key={ax}
            x={cx + (r + 12) * Math.cos(a)}
            y={cy + (r + 12) * Math.sin(a)}
            className="ws-chart__axis"
            textAnchor="middle"
          >
            {ax}
          </text>
        );
      })}
    </svg>
  );
}

export function ScatterPlot({
  points,
  label,
  color = "var(--afh-copper)",
}: {
  readonly points: readonly { x: number; y: number; name?: string }[];
  readonly label: string;
  readonly color?: string;
}) {
  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  return (
    <svg className="ws-chart" viewBox="0 0 320 160" role="img" aria-label={label}>
      <line x1="24" y1="140" x2="300" y2="140" stroke="var(--afh-border)" />
      <line x1="24" y1="20" x2="24" y2="140" stroke="var(--afh-border)" />
      {points.map((p, i) => (
        <circle
          key={p.name ?? i}
          cx={24 + (p.x / maxX) * 270}
          cy={140 - (p.y / maxY) * 110}
          r={5}
          fill={color}
        >
          <title>{p.name ?? `${p.x},${p.y}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function FunnelChart({
  stages,
  label,
}: {
  readonly stages: readonly { stage: string; value: number }[];
  readonly label: string;
}) {
  const max = stages[0]?.value ?? 1;
  return (
    <div className="ws-funnel" role="img" aria-label={label}>
      {stages.map((s) => (
        <div key={s.stage} className="ws-funnel__row">
          <span>{s.stage}</span>
          <div className="ws-funnel__track">
            <div style={{ width: `${Math.max(12, (s.value / max) * 100)}%` }}>
              {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressList({
  items,
  label,
}: {
  readonly items: readonly { name: string; pct: number }[];
  readonly label: string;
}) {
  return (
    <ul className="ws-progress" aria-label={label}>
      {items.map((item) => (
        <li key={item.name}>
          <div className="ws-progress__meta">
            <strong>{item.name}</strong>
            <span>{item.pct}%</span>
          </div>
          <div className="ws-progress__track">
            <div style={{ width: `${item.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Heatmap({
  grid,
  label,
}: {
  readonly grid: readonly (readonly number[])[];
  readonly label: string;
}) {
  const flat = grid.flat();
  const max = Math.max(...flat, 1);
  return (
    <div className="ws-heatmap" role="img" aria-label={label}>
      {grid.map((row, ri) => (
        <div key={ri} className="ws-heatmap__row">
          {row.map((cell, ci) => (
            <span
              key={ci}
              style={{ opacity: 0.25 + (cell / max) * 0.75 }}
              title={`Intensity ${cell}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarHeatmap({
  days,
  label,
}: {
  readonly days: readonly number[];
  readonly label: string;
}) {
  const max = Math.max(...days, 1);
  return (
    <div className="bi-cal-heat" role="img" aria-label={label}>
      {days.map((d, i) => (
        <span key={i} style={{ opacity: 0.2 + (d / max) * 0.8 }} title={`Day ${i + 1}: ${d}`} />
      ))}
    </div>
  );
}

export function TreeMap({
  items,
  label,
}: {
  readonly items: readonly { name: string; value: number; color: string }[];
  readonly label: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="bi-treemap" role="img" aria-label={label}>
      {items.map((item) => (
        <div
          key={item.name}
          style={{ flexGrow: item.value, background: item.color, flexBasis: `${(item.value / total) * 100}%` }}
        >
          <strong>{item.name}</strong>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SankeyPlaceholder({ label }: { readonly label: string }) {
  return (
    <div className="bi-sankey" role="img" aria-label={label}>
      <p>Sankey flow placeholder — render when Reporting APIs return flow nodes/links.</p>
      <svg viewBox="0 0 320 100">
        <path d="M20,20 C120,20 120,80 300,80" fill="none" stroke="var(--afh-teal)" strokeWidth="8" opacity="0.35" />
        <path d="M20,50 C120,50 120,50 300,50" fill="none" stroke="var(--afh-copper)" strokeWidth="8" opacity="0.35" />
        <path d="M20,80 C120,80 120,20 300,20" fill="none" stroke="var(--afh-ink-soft)" strokeWidth="8" opacity="0.25" />
      </svg>
    </div>
  );
}

export function GaugeChart({
  value,
  max = 100,
  label,
  color = "var(--afh-teal)",
}: {
  readonly value: number;
  readonly max?: number;
  readonly label: string;
  readonly color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = -90 + (pct / 100) * 180;
  return (
    <div className="bi-gauge" role="img" aria-label={label}>
      <svg viewBox="0 0 160 100">
        <path d="M20,90 A60,60 0 0 1 140,90" fill="none" stroke="var(--afh-stone)" strokeWidth="12" />
        <path
          d="M20,90 A60,60 0 0 1 140,90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${(pct / 100) * 188} 188`}
        />
        <line
          x1="80"
          y1="90"
          x2={80 + 48 * Math.cos((angle * Math.PI) / 180)}
          y2={90 + 48 * Math.sin((angle * Math.PI) / 180)}
          stroke="var(--afh-ink)"
          strokeWidth="2"
        />
      </svg>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function ProgressRing({
  pct,
  label,
  color = "var(--afh-teal)",
}: {
  readonly pct: number;
  readonly label: string;
  readonly color?: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg className="bi-ring" viewBox="0 0 100 100" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--afh-stone)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" className="bi-ring__text">
        {pct}%
      </text>
    </svg>
  );
}

export function Sparkline({
  values,
  label,
  color = "var(--afh-teal)",
}: {
  readonly values: readonly number[];
  readonly label: string;
  readonly color?: string;
}) {
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="bi-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

export function TimelineChart({
  items,
  label,
}: {
  readonly items: readonly { name: string; start: number; end: number }[];
  readonly label: string;
}) {
  return (
    <ul className="bi-timeline-chart" aria-label={label}>
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <div className="bi-timeline-chart__track">
            <div style={{ marginLeft: `${item.start}%`, width: `${Math.max(4, item.end - item.start)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WaterfallChart({
  steps,
  label,
}: {
  readonly steps: readonly { name: string; value: number }[];
  readonly label: string;
}) {
  let running = 0;
  const bars = steps.map((s) => {
    const start = running;
    running += s.value;
    return { ...s, start, end: running };
  });
  const min = Math.min(0, ...bars.map((b) => b.start), ...bars.map((b) => b.end));
  const max = Math.max(...bars.map((b) => b.start), ...bars.map((b) => b.end), 1);
  const span = max - min || 1;
  return (
    <div className="bi-waterfall" role="img" aria-label={label}>
      {bars.map((b) => {
        const bottom = ((Math.min(b.start, b.end) - min) / span) * 100;
        const height = (Math.abs(b.value) / span) * 100;
        return (
          <div key={b.name} className="bi-waterfall__col">
            <div className="bi-waterfall__track">
              <div
                className={b.value >= 0 ? "is-up" : "is-down"}
                style={{ bottom: `${bottom}%`, height: `${height}%` }}
                title={`${b.name}: ${b.value}`}
              />
            </div>
            <span>{b.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function LocationMap({
  points,
  label,
}: {
  readonly points: readonly {
    id: string;
    kind: string;
    label: string;
    x: number;
    y: number;
  }[];
  readonly label: string;
}) {
  // role="group" (not "img"): the map contains focusable pin buttons.
  return (
    <div className="ws-map" role="group" aria-label={label}>
      <div className="ws-map__field">
        {points.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ws-map__pin ws-map__pin--${p.kind}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${p.label} (${p.kind})`}
          >
            <span className="sr-only">{p.label}</span>
          </button>
        ))}
      </div>
      <ul className="ws-map__legend">
        <li><span className="ws-map__pin ws-map__pin--warehouse" /> Warehouses</li>
        <li><span className="ws-map__pin ws-map__pin--branch" /> Branches</li>
        <li><span className="ws-map__pin ws-map__pin--customer" /> Customers</li>
        <li><span className="ws-map__pin ws-map__pin--service" /> Service regions</li>
      </ul>
    </div>
  );
}
