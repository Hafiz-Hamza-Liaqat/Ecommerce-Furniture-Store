import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type ReactNode,
} from "react";
import {
  defaultTablePrefs,
  loadTablePrefs,
  saveTablePrefs,
  type TableDensity,
  type TableViewPrefs,
} from "../workspace/prefs";
import { StatusBadge } from "../workspace/widgets";
import { Button } from "../components/ui";

export type AdvColumn = {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly freezeable?: boolean;
};

export type AdvRow = {
  readonly id: string;
  readonly cells: Record<string, ReactNode>;
  readonly sortValues: Record<string, string | number>;
  readonly groupValue?: string;
};

type FilterRule = {
  readonly id: string;
  readonly field: string;
  readonly op: "contains" | "equals" | "starts";
  readonly value: string;
};

export function AdvancedDataTable({
  scope,
  columns,
  rows,
  selected,
  onSelectedChange,
  renderActions,
  onInlineEdit,
  exportPresets,
}: {
  readonly scope: string;
  readonly columns: readonly AdvColumn[];
  readonly rows: readonly AdvRow[];
  readonly selected: Set<string>;
  readonly onSelectedChange: (next: Set<string>) => void;
  readonly renderActions?: (id: string) => ReactNode;
  readonly onInlineEdit?: (id: string, key: string, value: string) => void;
  readonly exportPresets?: readonly { id: string; label: string; onRun: () => void }[];
}) {
  const keys = columns.map((c) => c.key);
  const columnKeySig = columns.map((c) => c.key).join("|");
  const [prefs, setPrefs] = useState<TableViewPrefs>(() => loadTablePrefs(scope, keys));
  const [chooserOpen, setChooserOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [viewName, setViewName] = useState("");
  const dragCol = useRef<string | null>(null);
  const selectionMemory = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPrefs(loadTablePrefs(scope, keys));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when scope/column identity changes
  }, [scope, columnKeySig]);

  const persist = useCallback(
    (next: TableViewPrefs) => {
      setPrefs(next);
      saveTablePrefs(scope, next);
    },
    [scope],
  );

  useEffect(() => {
    selectionMemory.current = new Set([...selectionMemory.current, ...selected]);
  }, [selected]);

  const orderedCols = useMemo(() => {
    const order = prefs.columnOrder.filter((k) => keys.includes(k));
    const missing = keys.filter((k) => !order.includes(k));
    const full = [...order, ...missing];
    return full
      .filter((k) => prefs.visibleKeys.includes(k))
      .map((k) => columns.find((c) => c.key === k)!)
      .filter(Boolean);
  }, [prefs, columns, keys]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      rules.every((rule) => {
        if (!rule.value) return true;
        const hay = String(r.sortValues[rule.field] ?? "").toLowerCase();
        const needle = rule.value.toLowerCase();
        if (rule.op === "equals") return hay === needle;
        if (rule.op === "starts") return hay.startsWith(needle);
        return hay.includes(needle);
      }),
    );
  }, [rows, rules]);

  const sorted = useMemo(() => {
    const sorts = prefs.sorts.length ? prefs.sorts : [{ key: keys[0] ?? "title", dir: "asc" as const }];
    return [...filtered].sort((a, b) => {
      for (const s of sorts) {
        const av = String(a.sortValues[s.key] ?? "");
        const bv = String(b.sortValues[s.key] ?? "");
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filtered, prefs.sorts, keys]);

  const grouped = useMemo(() => {
    if (!prefs.groupBy) return [{ key: "", rows: sorted }];
    const map = new Map<string, AdvRow[]>();
    for (const r of sorted) {
      const g = String(r.sortValues[prefs.groupBy] ?? r.groupValue ?? "—");
      const list = map.get(g) ?? [];
      list.push(r);
      map.set(g, list);
    }
    return [...map.entries()].map(([key, groupRows]) => ({ key, rows: groupRows }));
  }, [sorted, prefs.groupBy]);

  function toggleSort(key: string, multi: boolean) {
    const col = columns.find((c) => c.key === key);
    if (col && col.sortable === false) return;
    const existing = prefs.sorts.find((s) => s.key === key);
    let nextSorts = [...prefs.sorts];
    if (!multi) {
      if (existing) {
        nextSorts = [{ key, dir: existing.dir === "asc" ? "desc" : "asc" }];
      } else {
        nextSorts = [{ key, dir: "asc" }];
      }
    } else if (existing) {
      nextSorts = nextSorts.map((s) =>
        s.key === key ? { key: s.key, dir: (s.dir === "asc" ? "desc" : "asc") as "asc" | "desc" } : s,
      );
    } else {
      nextSorts = [...nextSorts, { key, dir: "asc" as const }].slice(0, 3);
    }
    persist({ ...prefs, sorts: nextSorts });
  }

  function setDensity(density: TableDensity) {
    persist({ ...prefs, density });
  }

  function onColDragStart(key: string) {
    dragCol.current = key;
  }

  function onColDrop(target: string) {
    const from = dragCol.current;
    dragCol.current = null;
    if (!from || from === target) return;
    const order = [...prefs.columnOrder];
    const fi = order.indexOf(from);
    const ti = order.indexOf(target);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1);
    order.splice(ti, 0, from);
    persist({ ...prefs, columnOrder: order });
  }

  function resizeCol(key: string, width: number) {
    persist({
      ...prefs,
      columnWidths: { ...prefs.columnWidths, [key]: Math.max(80, Math.min(420, width)) },
    });
  }

  const aggregates = useMemo(() => {
    const numericKeys = keys.filter((k) =>
      sorted.some((r) => typeof r.sortValues[k] === "number" || /amount|qty|total/i.test(k)),
    );
    return numericKeys.slice(0, 2).map((k) => {
      const nums = sorted
        .map((r) => Number(String(r.sortValues[k]).replace(/[^\d.-]/g, "")))
        .filter((n) => !Number.isNaN(n));
      const sum = nums.reduce((a, b) => a + b, 0);
      return { key: k, count: sorted.length, sum };
    });
  }, [sorted, keys]);

  return (
    <div className={`p5-table p5-table--${prefs.density}`}>
      <div className="p5-table__toolbar">
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => setChooserOpen((v) => !v)}>
            Columns
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setFilterOpen((v) => !v)}>
            Filter builder
          </button>
          <label className="p5-inline">
            <span>Group</span>
            <select
              value={prefs.groupBy ?? ""}
              onChange={(e) => persist({ ...prefs, groupBy: e.target.value || null })}
            >
              <option value="">None</option>
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="p5-inline">
            <span>Density</span>
            <select
              value={prefs.density}
              onChange={(e) => setDensity(e.target.value as TableDensity)}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label className="p5-inline">
            <span>Freeze</span>
            <select
              value={prefs.frozenCount}
              onChange={(e) => persist({ ...prefs, frozenCount: Number(e.target.value) })}
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label className="p5-inline">
            <span>Export</span>
            <select
              value={prefs.exportPreset}
              onChange={(e) =>
                persist({ ...prefs, exportPreset: e.target.value as TableViewPrefs["exportPreset"] })
              }
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          {(exportPresets ?? []).map((p) => (
            <button key={p.id} type="button" className="btn btn--ghost" onClick={p.onRun}>
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              const remembered = selectionMemory.current;
              onSelectedChange(new Set([...selected, ...remembered].filter((id) => rows.some((r) => r.id === id))));
            }}
          >
            Restore selection
          </button>
        </div>
      </div>

      {chooserOpen ? (
        <div className="p5-table__panel" role="region" aria-label="Column chooser">
          {columns.map((c) => (
            <label key={c.key} className="p5-check">
              <input
                type="checkbox"
                checked={prefs.visibleKeys.includes(c.key)}
                onChange={(e) => {
                  const visible = e.target.checked
                    ? [...prefs.visibleKeys, c.key]
                    : prefs.visibleKeys.filter((k) => k !== c.key);
                  persist({ ...prefs, visibleKeys: visible.length ? visible : [c.key] });
                }}
              />
              {c.label}
            </label>
          ))}
          <Button
            variant="ghost"
            onClick={() => persist(defaultTablePrefs(keys))}
          >
            Reset view
          </Button>
        </div>
      ) : null}

      {filterOpen ? (
        <div className="p5-table__panel stack" role="region" aria-label="Advanced filter builder">
          {rules.map((rule) => (
            <div key={rule.id} className="p5-filter-rule">
              <select
                value={rule.field}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, field: e.target.value } : r)),
                  )
                }
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={rule.op}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r) =>
                      r.id === rule.id ? { ...r, op: e.target.value as FilterRule["op"] } : r,
                    ),
                  )
                }
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
                <option value="starts">starts with</option>
              </select>
              <input
                value={rule.value}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, value: e.target.value } : r)),
                  )
                }
                placeholder="Value"
              />
              <button
                type="button"
                className="ws-icon-btn"
                onClick={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                setRules((prev) => [
                  ...prev,
                  {
                    id: `fr-${Date.now()}`,
                    field: keys[0] ?? "title",
                    op: "contains",
                    value: "",
                  },
                ])
              }
            >
              Add rule
            </button>
            <input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="Saved view name"
            />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!viewName.trim()}
              onClick={() => {
                const filters = Object.fromEntries(rules.map((r) => [r.field, r.value]));
                persist({
                  ...prefs,
                  savedViews: [
                    ...prefs.savedViews,
                    { id: `sv-${Date.now()}`, label: viewName.trim(), filters },
                  ].slice(0, 12),
                });
                setViewName("");
              }}
            >
              Save view
            </button>
          </div>
          {prefs.savedViews.length > 0 ? (
            <div className="row">
              {prefs.savedViews.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    setRules(
                      Object.entries(v.filters).map(([field, value], i) => ({
                        id: `sv-${v.id}-${i}`,
                        field,
                        op: "contains" as const,
                        value,
                      })),
                    )
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="ws-table-wrap ws-card p5-table__scroll">
        <table className="ws-table erp-table p5-adv-table">
          <thead>
            <tr>
              <th scope="col" className="p5-sticky-col">
                <span className="sr-only">Select</span>
              </th>
              {orderedCols.map((c, idx) => (
                <th
                  key={c.key}
                  scope="col"
                  className={idx < prefs.frozenCount ? "p5-frozen-col" : undefined}
                  style={prefs.columnWidths[c.key] ? { width: prefs.columnWidths[c.key], minWidth: prefs.columnWidths[c.key] } : undefined}
                  draggable
                  onDragStart={() => onColDragStart(c.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onColDrop(c.key)}
                >
                  <div className="p5-th">
                    <button
                      type="button"
                      className="erp-sort"
                      onClick={(e) => toggleSort(c.key, e.shiftKey)}
                    >
                      {c.label}
                      {prefs.sorts
                        .filter((s) => s.key === c.key)
                        .map((s) => (s.dir === "asc" ? " ↑" : " ↓"))
                        .join("")}
                    </button>
                    <input
                      type="range"
                      min={80}
                      max={360}
                      aria-label={`Resize ${c.label}`}
                      value={prefs.columnWidths[c.key] ?? 140}
                      onChange={(e) => resizeCol(c.key, Number(e.target.value))}
                      className="p5-resize"
                    />
                  </div>
                </th>
              ))}
              {renderActions ? <th scope="col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => (
              <Fragment key={`g-${group.key || "all"}`}>
                {prefs.groupBy ? (
                  <tr className="p5-group-row">
                    <td colSpan={orderedCols.length + 2}>
                      <strong>{group.key || "—"}</strong>
                      <span className="p5-muted"> · {group.rows.length}</span>
                    </td>
                  </tr>
                ) : null}
                {group.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p5-sticky-col">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          onSelectedChange(next);
                        }}
                        aria-label={`Select ${r.id}`}
                      />
                    </td>
                    {orderedCols.map((c, idx) => {
                      const editingCell = editing?.id === r.id && editing.key === c.key;
                      return (
                        <td
                          key={c.key}
                          className={idx < prefs.frozenCount ? "p5-frozen-col" : undefined}
                          onDoubleClick={() => {
                            if (!onInlineEdit) return;
                            setEditing({ id: r.id, key: c.key });
                            setEditValue(String(r.sortValues[c.key] ?? ""));
                          }}
                        >
                          {editingCell ? (
                            <input
                              className="field__input"
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                onInlineEdit?.(r.id, c.key, editValue);
                                setEditing(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onInlineEdit?.(r.id, c.key, editValue);
                                  setEditing(null);
                                }
                                if (e.key === "Escape") setEditing(null);
                              }}
                            />
                          ) : (
                            r.cells[c.key]
                          )}
                        </td>
                      );
                    })}
                    {renderActions ? <td>{renderActions(r.id)}</td> : null}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          {aggregates.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <StatusBadge status={`${sorted.length} rows`} tone="neutral" />
                </td>
                <td colSpan={Math.max(1, orderedCols.length)}>
                  {aggregates.map((a) => (
                    <span key={a.key} className="p5-agg">
                      {a.key}: Σ {a.sum.toLocaleString()}
                    </span>
                  ))}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <p className="p5-muted">
        Shift-click headers for multi-sort · drag headers to reorder · double-click cells to edit where supported
      </p>
    </div>
  );
}
