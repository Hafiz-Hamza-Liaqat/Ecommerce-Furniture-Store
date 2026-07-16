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
  return (
    <div className="ws-map" role="img" aria-label={label}>
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
