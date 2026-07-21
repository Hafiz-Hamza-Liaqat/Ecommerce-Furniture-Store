/**
 * RC10.7 — Manufacturing & inventory operations workspace.
 * Staff surface under /app/manufacturing/ops.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, PageHeader } from "../../../../components/ui";
import {
  BiBarPanel,
  BiDonutPanel,
  BiEmpty,
  BiKpiGrid,
} from "../../analytics/ui/BiWidgets";
import { computeOpsAnalytics } from "../analytics";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  PROCUREMENT_STAGES,
  PROCUREMENT_STAGE_LABELS,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_LABELS,
  type InventoryCategory,
  type OpsSearchFilters,
  type ProcurementStage,
  type ProductionStage,
} from "../types";
import {
  advanceProcurement,
  advanceProduction,
  adjustStock,
  availableStock,
  createBom,
  createItem,
  createProcurement,
  createProductionJob,
  createSupplier,
  listBoms,
  listItems,
  listMovements,
  listProductionJobs,
  listSalesOrdersForProduction,
  listSuppliers,
  receiveProcurement,
  recordReturn,
  releaseJobMaterials,
  searchOps,
  updateBom,
  updateItem,
  updateSupplier,
} from "../service";

type TabId =
  | "inventory"
  | "bom"
  | "suppliers"
  | "procurement"
  | "production"
  | "movements"
  | "analytics";

const TABS: { id: TabId; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "bom", label: "BOM" },
  { id: "suppliers", label: "Suppliers" },
  { id: "procurement", label: "Procurement" },
  { id: "production", label: "Production" },
  { id: "movements", label: "Movements" },
  { id: "analytics", label: "Analytics" },
];

export function OpsWorkflowPage() {
  const [tab, setTab] = useState<TabId>("inventory");
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState<OpsSearchFilters>({
    category: "all",
    stockStatus: "all",
    productionStage: "all",
    procurementStage: "all",
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = () => setTick((t) => t + 1);

  const searched = useMemo(() => {
    void tick;
    return searchOps(filters);
  }, [filters, tick]);
  const items = listItems();
  const suppliers = listSuppliers();
  const boms = listBoms();
  const jobs = listProductionJobs();
  const movements = listMovements();
  const salesOrders = listSalesOrdersForProduction();
  const analytics = useMemo(() => {
    void tick;
    return computeOpsAnalytics();
  }, [tick]);

  function run(action: () => void) {
    setError(null);
    try {
      action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  }

  return (
    <div className="stack cx-ops-page" data-ops-rev={tick}>
      <PageHeader
        title="Manufacturing operations"
        lead="Inventory, BOM, procurement, and production planning — local CX ops layer. Independent from CRM stages."
        actions={
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={refresh}>
              Refresh
            </Button>
            <Link className="btn" to="/app/manufacturing">
              ERP Manufacturing
            </Link>
            <Link className="btn" to="/app/inventory">
              ERP Inventory
            </Link>
          </div>
        }
      />

      <Alert tone="info">
        Barcode, QR labels, multi-warehouse, purchase invoices, cost accounting, MRP, and ERP
        integration are reserved extension points — not enabled in RC10.7.
      </Alert>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="bi-filters" aria-label="Ops filters">
        <div className="bi-filters__row">
          <label>
            <span>SKU / name</span>
            <input
              value={filters.sku ?? ""}
              onChange={(e) => setFilters({ ...filters, sku: e.target.value })}
              placeholder="Search"
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={filters.category ?? "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  category: e.target.value as InventoryCategory | "all",
                })
              }
            >
              <option value="all">All</option>
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {INVENTORY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Stock status</span>
            <select
              value={filters.stockStatus ?? "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  stockStatus: e.target.value as "all" | "ok" | "low" | "out",
                })
              }
            >
              <option value="all">All</option>
              <option value="ok">OK</option>
              <option value="low">Low</option>
              <option value="out">Out</option>
            </select>
          </label>
          <label>
            <span>Supplier</span>
            <select
              value={filters.supplierId ?? "all"}
              onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
            >
              <option value="all">All</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Production stage</span>
            <select
              value={filters.productionStage ?? "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  productionStage: e.target.value as ProductionStage | "all",
                })
              }
            >
              <option value="all">All</option>
              {PRODUCTION_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PRODUCTION_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Procurement stage</span>
            <select
              value={filters.procurementStage ?? "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  procurementStage: e.target.value as ProcurementStage | "all",
                })
              }
            >
              <option value="all">All</option>
              {PROCUREMENT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PROCUREMENT_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Material</span>
            <input
              value={filters.material ?? ""}
              onChange={(e) => setFilters({ ...filters, material: e.target.value })}
              placeholder="Wood, fabric…"
            />
          </label>
          <label>
            <span>Date from</span>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </label>
          <label>
            <span>Date to</span>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </label>
        </div>
      </div>

      <nav className="erp-subnav" aria-label="Ops sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`erp-subnav__link${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "inventory" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Inventory items</h2>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  const sku = window.prompt("SKU");
                  if (!sku) return;
                  const name = window.prompt("Name") || sku;
                  const cat = (window.prompt(
                    `Category (${INVENTORY_CATEGORIES.join(", ")})`,
                    "wood",
                  ) || "wood") as InventoryCategory;
                  const stock = Number(window.prompt("Opening stock", "10") || "0");
                  const min = Number(window.prompt("Minimum stock", "2") || "0");
                  const cost = Number(window.prompt("Unit cost PKR", "1000") || "0");
                  createItem({
                    sku,
                    name,
                    category: INVENTORY_CATEGORIES.includes(cat) ? cat : "other",
                    stockOnHand: stock,
                    minStock: min,
                    unitCostPkr: cost,
                    ...(suppliers[0]?.id ? { supplierId: suppliers[0].id } : {}),
                  });
                })
              }
            >
              New item
            </Button>
          </header>
          <div className="ws-card__body">
            {searched.items.length === 0 ? (
              <BiEmpty title="No items" body="Create inventory items to begin tracking stock." />
            ) : (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>On hand</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Min</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searched.items.map((i) => {
                    const avail = availableStock(i);
                    const low = avail <= i.minStock;
                    return (
                      <tr key={i.id}>
                        <td>{i.sku}</td>
                        <td>{i.name}</td>
                        <td>{INVENTORY_CATEGORY_LABELS[i.category]}</td>
                        <td>{i.stockOnHand}</td>
                        <td>{i.reserved}</td>
                        <td>{avail}</td>
                        <td>
                          {i.minStock}
                          {low ? " · low" : ""}
                        </td>
                        <td>{i.status}</td>
                        <td>
                          <div className="row" style={{ gap: "0.25rem", flexWrap: "wrap" }}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                run(() => {
                                  const name = window.prompt("Name", i.name);
                                  if (name == null) return;
                                  const min = Number(
                                    window.prompt("Minimum stock", String(i.minStock)) ??
                                      i.minStock,
                                  );
                                  updateItem(i.id, {
                                    name,
                                    minStock: Number.isFinite(min) ? min : i.minStock,
                                  });
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                run(() => {
                                  const delta = Number(window.prompt("Adjust qty (+/−)", "1") || "0");
                                  if (!delta) return;
                                  adjustStock(i.id, delta, window.prompt("Note") || "Manual adjust");
                                })
                              }
                            >
                              Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                run(() => {
                                  const qty = Number(window.prompt("Return qty", "1") || "0");
                                  if (qty <= 0) return;
                                  recordReturn(i.id, qty, window.prompt("Note") || "Return");
                                })
                              }
                            >
                              Return
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}

      {tab === "bom" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Bills of materials</h2>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  const product = items.find((i) => i.category === "furniture_product") ?? items[0];
                  if (!product) throw new Error("Create a product inventory item first");
                  const materials = items.filter((i) => i.id !== product.id);
                  if (materials.length === 0) throw new Error("Add at least one material item");
                  const defaultLines = materials
                    .slice(0, 3)
                    .map((m) => `${m.sku}:1`)
                    .join(", ");
                  const raw =
                    window.prompt(
                      "Material lines as SKU:qty (comma-separated)",
                      defaultLines,
                    ) || defaultLines;
                  const lines = raw
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .map((part) => {
                      const [skuPart, qtyPart] = part.split(":");
                      const mat = materials.find(
                        (m) => m.sku.toLowerCase() === (skuPart ?? "").trim().toLowerCase(),
                      );
                      if (!mat) throw new Error(`Unknown material SKU: ${skuPart}`);
                      return {
                        itemId: mat.id,
                        qtyPerUnit: Math.max(0.01, Number(qtyPart) || 1),
                      };
                    });
                  createBom({
                    productItemId: product.id,
                    label:
                      window.prompt("BOM label", `${product.name} BOM`) || `${product.name} BOM`,
                    lines,
                  });
                })
              }
            >
              New BOM
            </Button>
          </header>
          <div className="ws-card__body">
            {boms.length === 0 ? (
              <BiEmpty title="No BOMs" body="Define material quantities per finished product." />
            ) : (
              <ul className="ws-feed">
                {boms.map((b) => (
                  <li key={b.id}>
                    <strong>{b.label}</strong>
                    <p>
                      {b.lines.length} line(s) · product{" "}
                      {items.find((i) => i.id === b.productItemId)?.sku ?? b.productItemId}
                    </p>
                    <ul>
                      {b.lines.map((l) => {
                        const it = items.find((i) => i.id === l.itemId);
                        return (
                          <li key={`${b.id}-${l.itemId}`}>
                            {it?.sku ?? l.itemId}: {l.qtyPerUnit} / unit
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        run(() => {
                          const label = window.prompt("BOM label", b.label);
                          if (label == null) return;
                          const raw = window.prompt(
                            "Material lines as SKU:qty (comma-separated)",
                            b.lines
                              .map((l) => {
                                const it = items.find((i) => i.id === l.itemId);
                                return `${it?.sku ?? l.itemId}:${l.qtyPerUnit}`;
                              })
                              .join(", "),
                          );
                          if (raw == null) return;
                          const lines = raw
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean)
                            .map((part) => {
                              const [skuPart, qtyPart] = part.split(":");
                              const mat = items.find(
                                (m) =>
                                  m.sku.toLowerCase() === (skuPart ?? "").trim().toLowerCase(),
                              );
                              if (!mat) throw new Error(`Unknown material SKU: ${skuPart}`);
                              return {
                                itemId: mat.id,
                                qtyPerUnit: Math.max(0.01, Number(qtyPart) || 1),
                              };
                            });
                          updateBom(b.id, { label, lines });
                        })
                      }
                    >
                      Edit BOM
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "suppliers" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Suppliers</h2>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  const company = window.prompt("Company name");
                  if (!company) return;
                  createSupplier({
                    company,
                    contactPerson: window.prompt("Contact person") || "",
                    phone: window.prompt("Phone") || "",
                    email: window.prompt("Email") || "",
                    address: window.prompt("Address") || "",
                    categories: ["wood", "hardware"],
                  });
                })
              }
            >
              New supplier
            </Button>
          </header>
          <div className="ws-card__body">
            {suppliers.length === 0 ? (
              <BiEmpty title="No suppliers" body="Add supplier records for procurement." />
            ) : (
              <ul className="ws-feed">
                {suppliers.map((s) => (
                  <li key={s.id}>
                    <strong>{s.company}</strong>
                    <p>
                      {s.contactPerson || "—"} · {s.phone || "—"} · {s.email || "—"}
                    </p>
                    <p className="cx-muted">{s.address}</p>
                    <p className="cx-muted">
                      Categories:{" "}
                      {s.categories.map((c) => INVENTORY_CATEGORY_LABELS[c]).join(", ") || "—"}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        run(() => {
                          const company = window.prompt("Company", s.company);
                          if (company == null) return;
                          const contactPerson =
                            window.prompt("Contact person", s.contactPerson) ?? s.contactPerson;
                          const phone = window.prompt("Phone", s.phone) ?? s.phone;
                          const email = window.prompt("Email", s.email) ?? s.email;
                          const address = window.prompt("Address", s.address) ?? s.address;
                          const catsRaw =
                            window.prompt(
                              `Categories (${INVENTORY_CATEGORIES.join(", ")})`,
                              s.categories.join(","),
                            ) ?? s.categories.join(",");
                          const categories = catsRaw
                            .split(",")
                            .map((c) => c.trim())
                            .filter((c): c is InventoryCategory =>
                              (INVENTORY_CATEGORIES as readonly string[]).includes(c),
                            );
                          updateSupplier(s.id, {
                            company,
                            contactPerson,
                            phone,
                            email,
                            address,
                            categories,
                          });
                        })
                      }
                    >
                      Edit
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "procurement" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Procurement</h2>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  if (!suppliers[0]) throw new Error("Create a supplier first");
                  if (!items[0]) throw new Error("Create an inventory item first");
                  const qty = Number(window.prompt("Qty to order", "20") || "1");
                  createProcurement({
                    supplierId: suppliers[0].id,
                    lines: [{ itemId: items[0].id, qtyOrdered: Math.max(1, qty) }],
                    notes: "Created from ops workspace",
                  });
                })
              }
            >
              New request
            </Button>
          </header>
          <div className="ws-card__body">
            {searched.procurements.length === 0 ? (
              <BiEmpty title="No procurement" body="Create and advance purchase requests." />
            ) : (
              <ul className="ws-feed">
                {searched.procurements.map((p) => (
                  <li key={p.id}>
                    <strong>
                      {suppliers.find((s) => s.id === p.supplierId)?.company ?? p.supplierId}
                    </strong>
                    <span> · {PROCUREMENT_STAGE_LABELS[p.stage]}</span>
                    <p>
                      {p.lines
                        .map((l) => {
                          const it = items.find((i) => i.id === l.itemId);
                          return `${it?.sku ?? l.itemId} ${l.qtyReceived}/${l.qtyOrdered}`;
                        })
                        .join(", ")}
                    </p>
                    <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                      <label>
                        Stage
                        <select
                          value={p.stage}
                          onChange={(e) =>
                            run(() =>
                              advanceProcurement(p.id, e.target.value as ProcurementStage),
                            )
                          }
                        >
                          {PROCUREMENT_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {PROCUREMENT_STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          run(() => {
                            receiveProcurement(
                              p.id,
                              p.lines.map((l) => ({
                                itemId: l.itemId,
                                qty: Math.max(0, l.qtyOrdered - l.qtyReceived),
                              })),
                            );
                          })
                        }
                      >
                        Receive all
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "production" ? (
        <div className="stack">
          <section className="ws-card">
            <header className="ws-card__head">
              <h2>Production jobs</h2>
              <Button
                variant="primary"
                onClick={() =>
                  run(() => {
                    if (!boms[0]) throw new Error("Create a BOM first");
                    const qty = Number(window.prompt("Job quantity", "1") || "1");
                    const so = salesOrders[0];
                    createProductionJob({
                      label:
                        window.prompt("Job label", `Job ${jobs.length + 1}`) ||
                        `Job ${jobs.length + 1}`,
                      bomId: boms[0].id,
                      qty: Math.max(1, qty),
                      ...(so ? { salesOrderId: so.id } : {}),
                    });
                  })
                }
              >
                New job
              </Button>
            </header>
            <div className="ws-card__body">
              {salesOrders.length > 0 ? (
                <p className="cx-muted">
                  {salesOrders.length} approved/in-production sales order(s) available as optional
                  references (read-only).
                </p>
              ) : null}
              {searched.jobs.length === 0 ? (
                <BiEmpty
                  title="No production jobs"
                  body="Allocate materials from BOM; shortages block material-ready until procured."
                />
              ) : (
                <ul className="ws-feed">
                  {searched.jobs.map((j) => (
                    <li key={j.id}>
                      <strong>{j.label}</strong>
                      <span> · {PRODUCTION_STAGE_LABELS[j.stage]} · qty {j.qty}</span>
                      {j.pendingProcurement ? (
                        <p className="cx-muted">Pending procurement (shortages present)</p>
                      ) : null}
                      <ul>
                        {j.allocations.map((a) => {
                          const it = items.find((i) => i.id === a.itemId);
                          return (
                            <li key={a.itemId}>
                              {it?.sku ?? a.itemId}: need {a.required}, allocated {a.allocated},
                              shortage {a.shortage}
                            </li>
                          );
                        })}
                      </ul>
                      <label>
                        Stage
                        <select
                          value={j.stage}
                          onChange={(e) =>
                            run(() => advanceProduction(j.id, e.target.value as ProductionStage))
                          }
                        >
                          {PRODUCTION_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {PRODUCTION_STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {j.stage === "queued" || j.stage === "material_ready" ? (
                        <Button
                          variant="ghost"
                          onClick={() => run(() => releaseJobMaterials(j.id))}
                        >
                          Release materials
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "movements" ? (
        <section className="ws-card">
          <header className="ws-card__head">
            <h2>Stock movements</h2>
          </header>
          <div className="ws-card__body">
            {movements.length === 0 ? (
              <BiEmpty title="No movements" body="Receiving, allocations, and adjustments appear here." />
            ) : (
              <ul className="ws-feed">
                {movements.slice(0, 40).map((m) => {
                  const it = items.find((i) => i.id === m.itemId);
                  return (
                    <li key={m.id}>
                      <strong>{m.type}</strong>
                      <span>
                        {" "}
                        · {it?.sku ?? m.itemId} · Δ{m.qtyDelta} / reserved Δ{m.reservedDelta}
                      </span>
                      <p className="cx-muted">
                        {new Date(m.at).toLocaleString()} — {m.note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {tab === "analytics" ? (
        <div className="stack">
          <BiKpiGrid
            items={[
              {
                id: "val",
                label: "Inventory valuation (est.)",
                value: `PKR ${analytics.valuationPkr.toLocaleString("en-PK")}`,
              },
              {
                id: "backlog",
                label: "Production backlog",
                value: String(analytics.productionBacklog),
              },
              {
                id: "low",
                label: "Low stock items",
                value: String(analytics.lowStock.length),
              },
              {
                id: "short",
                label: "Active shortages",
                value: String(analytics.shortages.length),
              },
            ]}
          />
          <div className="erp-dash-grid">
            <BiBarPanel title="Low stock" items={analytics.lowStock} />
            <BiBarPanel title="Fast-moving materials" items={analytics.fastMoving} />
            <BiBarPanel title="Slow-moving materials" items={analytics.slowMoving} />
            <BiBarPanel title="Material shortages" items={analytics.shortages} />
            <BiDonutPanel title="Procurement by stage" items={analytics.procurementByStage} />
            <BiDonutPanel title="Production by stage" items={analytics.productionByStage} />
            <BiBarPanel title="Supplier open POs" items={analytics.supplierLoad} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
