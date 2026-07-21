/**
 * RC10.7 — Ops service (inventory, BOM, procurement, production, movements).
 * Never mutates sales/CRM/planner stores. Never allows negative on-hand stock.
 */

import { listOrders } from "../sales";
import type { SalesOrder } from "../sales/types";
import { loadOpsWorkspace, nowIso, saveOpsWorkspace, uid } from "./store";
import type {
  BillOfMaterials,
  BomLine,
  InventoryCategory,
  InventoryItem,
  ItemStatus,
  MaterialAllocationLine,
  MovementType,
  OpsExtensionHooks,
  OpsSearchFilters,
  OpsWorkspaceState,
  ProcurementLine,
  ProcurementRequest,
  ProcurementStage,
  ProductionJob,
  ProductionStage,
  StockMovement,
  Supplier,
  SupplierStatus,
} from "./types";
import { PROCUREMENT_STAGES, PRODUCTION_STAGES } from "./types";

let extensionHooks: OpsExtensionHooks = {};

export function registerOpsExtensionHooks(hooks: OpsExtensionHooks): void {
  extensionHooks = { ...extensionHooks, ...hooks };
  void extensionHooks;
}

function mutate(
  updater: (state: OpsWorkspaceState) => OpsWorkspaceState,
): OpsWorkspaceState {
  const next = updater(loadOpsWorkspace());
  saveOpsWorkspace(next);
  return next;
}

export function availableStock(item: InventoryItem): number {
  return Math.max(0, item.stockOnHand - item.reserved);
}

function assertNonNegative(onHand: number, reserved: number, context: string): void {
  if (onHand < 0 || reserved < 0) {
    throw new Error(`Inventory invariant violated (${context}): negative stock not allowed`);
  }
  if (reserved > onHand) {
    throw new Error(`Inventory invariant violated (${context}): reserved exceeds on-hand`);
  }
}

function applyMovement(
  state: OpsWorkspaceState,
  input: {
    itemId: string;
    type: MovementType;
    qtyDelta: number;
    reservedDelta: number;
    note: string;
    refType?: string;
    refId?: string;
  },
): OpsWorkspaceState {
  const item = state.items.find((i) => i.id === input.itemId);
  if (!item) throw new Error("Inventory item not found");
  const stockOnHand = item.stockOnHand + input.qtyDelta;
  const reserved = item.reserved + input.reservedDelta;
  assertNonNegative(stockOnHand, reserved, input.type);
  const at = nowIso();
  const movement: StockMovement = {
    id: uid(),
    itemId: input.itemId,
    type: input.type,
    qtyDelta: input.qtyDelta,
    reservedDelta: input.reservedDelta,
    note: input.note,
    ...(input.refType ? { refType: input.refType } : {}),
    ...(input.refId ? { refId: input.refId } : {}),
    at,
  };
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === item.id
        ? { ...i, stockOnHand, reserved, updatedAt: at }
        : i,
    ),
    movements: [movement, ...state.movements].slice(0, 2000),
  };
}

/* ---------- Inventory ---------- */

export function listItems(): InventoryItem[] {
  return [...loadOpsWorkspace().items];
}

export function getItem(id: string): InventoryItem | null {
  return loadOpsWorkspace().items.find((i) => i.id === id) ?? null;
}

function assertUniqueSku(sku: string, exceptId?: string): void {
  const normalized = sku.trim().toLowerCase();
  if (!normalized) throw new Error("SKU is required");
  const clash = loadOpsWorkspace().items.find(
    (i) => i.sku.toLowerCase() === normalized && i.id !== exceptId,
  );
  if (clash) throw new Error(`Duplicate SKU not allowed: ${clash.sku}`);
}

export function createItem(input: {
  readonly sku: string;
  readonly category: InventoryCategory;
  readonly name: string;
  readonly description?: string;
  readonly unit?: string;
  readonly stockOnHand?: number;
  readonly minStock?: number;
  readonly supplierId?: string;
  readonly unitCostPkr?: number;
  readonly status?: ItemStatus;
}): InventoryItem {
  assertUniqueSku(input.sku);
  const at = nowIso();
  const stock = Math.max(0, input.stockOnHand ?? 0);
  const created: InventoryItem = {
    id: uid(),
    sku: input.sku.trim(),
    category: input.category,
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    unit: (input.unit ?? "ea").trim() || "ea",
    stockOnHand: stock,
    reserved: 0,
    minStock: Math.max(0, input.minStock ?? 0),
    ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    unitCostPkr: Math.max(0, input.unitCostPkr ?? 0),
    status: input.status ?? "active",
    createdAt: at,
    updatedAt: at,
  };
  mutate((s) => ({ ...s, items: [created, ...s.items] }));
  return created;
}

export function updateItem(
  id: string,
  patch: {
    readonly sku?: string;
    readonly name?: string;
    readonly description?: string;
    readonly unit?: string;
    readonly minStock?: number;
    readonly supplierId?: string | null;
    readonly unitCostPkr?: number;
    readonly status?: ItemStatus;
    readonly category?: InventoryCategory;
  },
): InventoryItem | null {
  let updated: InventoryItem | null = null;
  mutate((s) => {
    const current = s.items.find((i) => i.id === id);
    if (!current) return s;
    if (patch.sku !== undefined) assertUniqueSku(patch.sku, id);
    const next: InventoryItem = {
      ...current,
      ...(patch.sku !== undefined ? { sku: patch.sku.trim() } : {}),
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit.trim() || "ea" } : {}),
      ...(patch.minStock !== undefined ? { minStock: Math.max(0, patch.minStock) } : {}),
      ...(patch.unitCostPkr !== undefined ? { unitCostPkr: Math.max(0, patch.unitCostPkr) } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      updatedAt: nowIso(),
    };
    if (patch.supplierId === null) {
      updated = {
        id: next.id,
        sku: next.sku,
        category: next.category,
        name: next.name,
        description: next.description,
        unit: next.unit,
        stockOnHand: next.stockOnHand,
        reserved: next.reserved,
        minStock: next.minStock,
        unitCostPkr: next.unitCostPkr,
        status: next.status,
        createdAt: next.createdAt,
        updatedAt: next.updatedAt,
      };
    } else if (patch.supplierId !== undefined) {
      updated = { ...next, supplierId: patch.supplierId };
    } else {
      updated = next;
    }
    return {
      ...s,
      items: s.items.map((i) => (i.id === id ? updated! : i)),
    };
  });
  return updated;
}

export function adjustStock(itemId: string, qtyDelta: number, note: string): InventoryItem {
  const state = mutate((s) =>
    applyMovement(s, {
      itemId,
      type: qtyDelta >= 0 ? "manual_adjustment" : "correction",
      qtyDelta,
      reservedDelta: 0,
      note: note || "Manual adjustment",
    }),
  );
  return state.items.find((i) => i.id === itemId)!;
}

/** Customer/supplier return into stock (positive on-hand). */
export function recordReturn(itemId: string, qty: number, note: string): InventoryItem {
  const take = Math.max(0, qty);
  if (take <= 0) throw new Error("Return quantity must be positive");
  const state = mutate((s) =>
    applyMovement(s, {
      itemId,
      type: "return",
      qtyDelta: take,
      reservedDelta: 0,
      note: note || "Return",
    }),
  );
  return state.items.find((i) => i.id === itemId)!;
}

/* ---------- Suppliers ---------- */

export function listSuppliers(): Supplier[] {
  return [...loadOpsWorkspace().suppliers];
}

export function createSupplier(input: {
  readonly company: string;
  readonly contactPerson?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly categories?: readonly InventoryCategory[];
  readonly performanceNotes?: string;
  readonly status?: SupplierStatus;
}): Supplier {
  const at = nowIso();
  const created: Supplier = {
    id: uid(),
    company: input.company.trim(),
    contactPerson: (input.contactPerson ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    email: (input.email ?? "").trim(),
    address: (input.address ?? "").trim(),
    categories: input.categories ?? [],
    performanceNotes: (input.performanceNotes ?? "").trim(),
    status: input.status ?? "active",
    createdAt: at,
    updatedAt: at,
  };
  mutate((s) => ({ ...s, suppliers: [created, ...s.suppliers] }));
  return created;
}

export function updateSupplier(
  id: string,
  patch: {
    readonly company?: string;
    readonly contactPerson?: string;
    readonly phone?: string;
    readonly email?: string;
    readonly address?: string;
    readonly categories?: readonly InventoryCategory[];
    readonly performanceNotes?: string;
    readonly status?: SupplierStatus;
  },
): Supplier | null {
  let updated: Supplier | null = null;
  mutate((s) => {
    const current = s.suppliers.find((x) => x.id === id);
    if (!current) return s;
    updated = {
      ...current,
      ...(patch.company !== undefined ? { company: patch.company.trim() } : {}),
      ...(patch.contactPerson !== undefined
        ? { contactPerson: patch.contactPerson.trim() }
        : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
      ...(patch.email !== undefined ? { email: patch.email.trim() } : {}),
      ...(patch.address !== undefined ? { address: patch.address.trim() } : {}),
      ...(patch.categories !== undefined ? { categories: patch.categories } : {}),
      ...(patch.performanceNotes !== undefined
        ? { performanceNotes: patch.performanceNotes.trim() }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: nowIso(),
    };
    return {
      ...s,
      suppliers: s.suppliers.map((x) => (x.id === id ? updated! : x)),
    };
  });
  return updated;
}

/* ---------- BOM ---------- */

export function listBoms(): BillOfMaterials[] {
  return [...loadOpsWorkspace().boms];
}

export function createBom(input: {
  readonly productItemId: string;
  readonly label: string;
  readonly lines: readonly BomLine[];
}): BillOfMaterials {
  const at = nowIso();
  const created: BillOfMaterials = {
    id: uid(),
    productItemId: input.productItemId,
    label: input.label.trim(),
    lines: input.lines.filter((l) => l.qtyPerUnit > 0),
    createdAt: at,
    updatedAt: at,
  };
  if (created.lines.length === 0) throw new Error("BOM requires at least one material line");
  mutate((s) => ({ ...s, boms: [created, ...s.boms] }));
  return created;
}

export function updateBom(
  id: string,
  patch: {
    readonly label?: string;
    readonly productItemId?: string;
    readonly lines?: readonly BomLine[];
  },
): BillOfMaterials | null {
  let updated: BillOfMaterials | null = null;
  mutate((s) => {
    const current = s.boms.find((b) => b.id === id);
    if (!current) return s;
    const lines = (patch.lines ?? current.lines).filter((l) => l.qtyPerUnit > 0);
    if (lines.length === 0) throw new Error("BOM requires at least one material line");
    updated = {
      ...current,
      ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
      ...(patch.productItemId !== undefined ? { productItemId: patch.productItemId } : {}),
      lines,
      updatedAt: nowIso(),
    };
    return {
      ...s,
      boms: s.boms.map((b) => (b.id === id ? updated! : b)),
    };
  });
  return updated;
}

/* ---------- Procurement ---------- */

export function listProcurements(): ProcurementRequest[] {
  return [...loadOpsWorkspace().procurements];
}

export function createProcurement(input: {
  readonly supplierId: string;
  readonly lines: readonly { itemId: string; qtyOrdered: number }[];
  readonly expectedDelivery?: string;
  readonly notes?: string;
}): ProcurementRequest {
  const at = nowIso();
  const lines: ProcurementLine[] = input.lines
    .filter((l) => l.qtyOrdered > 0)
    .map((l) => ({ itemId: l.itemId, qtyOrdered: l.qtyOrdered, qtyReceived: 0 }));
  const created: ProcurementRequest = {
    id: uid(),
    supplierId: input.supplierId,
    stage: "draft",
    lines,
    ...(input.expectedDelivery ? { expectedDelivery: input.expectedDelivery } : {}),
    notes: (input.notes ?? "").trim(),
    createdAt: at,
    updatedAt: at,
  };
  mutate((s) => ({ ...s, procurements: [created, ...s.procurements] }));
  return created;
}

export function advanceProcurement(
  id: string,
  stage: ProcurementStage,
): ProcurementRequest | null {
  let updated: ProcurementRequest | null = null;
  mutate((s) => {
    const current = s.procurements.find((p) => p.id === id);
    if (!current) return s;
    const curIdx = PROCUREMENT_STAGES.indexOf(current.stage);
    const nextIdx = PROCUREMENT_STAGES.indexOf(stage);
    if (nextIdx < curIdx) return s;
    updated = { ...current, stage, updatedAt: nowIso() };
    return {
      ...s,
      procurements: s.procurements.map((p) => (p.id === id ? updated! : p)),
    };
  });
  return updated;
}

export function receiveProcurement(
  id: string,
  receipts: readonly { itemId: string; qty: number }[],
): ProcurementRequest | null {
  let updated: ProcurementRequest | null = null;
  mutate((s) => {
    const current = s.procurements.find((p) => p.id === id);
    if (!current) return s;
    if (current.stage !== "ordered" && current.stage !== "approved" && current.stage !== "received") {
      throw new Error("Procurement must be approved/ordered before receiving");
    }
    let next = { ...s };
    const lineMap = new Map(current.lines.map((l) => [l.itemId, { ...l }]));
    for (const r of receipts) {
      if (r.qty <= 0) continue;
      const line = lineMap.get(r.itemId);
      if (!line) continue;
      const remaining = line.qtyOrdered - line.qtyReceived;
      const take = Math.min(r.qty, remaining);
      if (take <= 0) continue;
      line.qtyReceived += take;
      next = applyMovement(next, {
        itemId: r.itemId,
        type: "purchase_received",
        qtyDelta: take,
        reservedDelta: 0,
        note: `PO receive ${id}`,
        refType: "procurement",
        refId: id,
      });
    }
    const lines = current.lines.map((l) => lineMap.get(l.itemId) ?? l);
    const allReceived = lines.every((l) => l.qtyReceived >= l.qtyOrdered);
    updated = {
      ...current,
      lines,
      stage: allReceived ? "received" : "ordered",
      updatedAt: nowIso(),
    };
    return {
      ...next,
      procurements: next.procurements.map((p) => (p.id === id ? updated! : p)),
    };
  });
  return updated;
}

/* ---------- Production & allocation ---------- */

function computeAllocations(
  state: OpsWorkspaceState,
  bom: BillOfMaterials,
  qty: number,
): { lines: MaterialAllocationLine[]; pendingProcurement: boolean } {
  const lines: MaterialAllocationLine[] = bom.lines.map((bl) => {
    const item = state.items.find((i) => i.id === bl.itemId);
    const required = bl.qtyPerUnit * qty;
    const avail = item ? availableStock(item) : 0;
    const allocated = Math.min(required, Math.max(0, avail));
    const shortage = Math.max(0, required - allocated);
    return { itemId: bl.itemId, required, allocated, shortage };
  });
  return {
    lines,
    pendingProcurement: lines.some((l) => l.shortage > 0),
  };
}

export function listProductionJobs(): ProductionJob[] {
  return [...loadOpsWorkspace().jobs];
}

/** Read-only bridge: approved/in-production sales orders available for planning. */
export function listSalesOrdersForProduction(): SalesOrder[] {
  return listOrders().filter(
    (o) =>
      o.status === "approved" ||
      o.status === "in_production" ||
      o.status === "ready_for_delivery",
  );
}

export function createProductionJob(input: {
  readonly label: string;
  readonly bomId: string;
  readonly qty: number;
  readonly salesOrderId?: string;
}): ProductionJob {
  let created!: ProductionJob;
  mutate((s) => {
    const bom = s.boms.find((b) => b.id === input.bomId);
    if (!bom) throw new Error("BOM not found");
    const qty = Math.max(1, Math.floor(input.qty));
    const { lines, pendingProcurement } = computeAllocations(s, bom, qty);
    let next = s;
    // Reserve allocated quantities
    for (const line of lines) {
      if (line.allocated <= 0) continue;
      next = applyMovement(next, {
        itemId: line.itemId,
        type: "production_allocation",
        qtyDelta: 0,
        reservedDelta: line.allocated,
        note: `Allocate for job`,
        refType: "production",
        refId: "pending",
      });
    }
    const at = nowIso();
    created = {
      id: uid(),
      label: input.label.trim(),
      ...(input.salesOrderId ? { salesOrderId: input.salesOrderId } : {}),
      bomId: input.bomId,
      qty,
      stage: pendingProcurement ? "queued" : "material_ready",
      allocations: lines,
      pendingProcurement,
      createdAt: at,
      updatedAt: at,
    };
    // Fix movement refs with real job id
    next = {
      ...next,
      movements: next.movements.map((m) =>
        m.refId === "pending" && m.type === "production_allocation"
          ? { ...m, refId: created.id }
          : m,
      ),
      jobs: [created, ...next.jobs],
    };
    return next;
  });
  return created;
}

export function advanceProduction(id: string, stage: ProductionStage): ProductionJob | null {
  let updated: ProductionJob | null = null;
  mutate((s) => {
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return s;
    const curIdx = PRODUCTION_STAGES.indexOf(job.stage);
    const nextIdx = PRODUCTION_STAGES.indexOf(stage);
    if (nextIdx < curIdx) return s;

    let next = s;
    // On entering in_production: consume reserved materials
    if (stage === "in_production" && job.stage !== "in_production") {
      for (const line of job.allocations) {
        if (line.allocated <= 0) continue;
        next = applyMovement(next, {
          itemId: line.itemId,
          type: "production_consumption",
          qtyDelta: -line.allocated,
          reservedDelta: -line.allocated,
          note: `Consume for ${job.label}`,
          refType: "production",
          refId: job.id,
        });
      }
    }
    updated = { ...job, stage, updatedAt: nowIso(), pendingProcurement: job.pendingProcurement };
    if (stage === "material_ready") {
      updated = { ...updated, pendingProcurement: false };
    }
    return {
      ...next,
      jobs: next.jobs.map((j) => (j.id === id ? updated! : j)),
    };
  });
  return updated;
}

/** Release reserved materials for a job that has not yet consumed them. */
export function releaseJobMaterials(id: string): ProductionJob | null {
  let updated: ProductionJob | null = null;
  mutate((s) => {
    const job = s.jobs.find((j) => j.id === id);
    if (!job) return s;
    if (job.stage !== "queued" && job.stage !== "material_ready") {
      throw new Error("Can only release materials before production starts");
    }
    let next = s;
    for (const line of job.allocations) {
      if (line.allocated <= 0) continue;
      next = applyMovement(next, {
        itemId: line.itemId,
        type: "allocation_release",
        qtyDelta: 0,
        reservedDelta: -line.allocated,
        note: `Release for ${job.label}`,
        refType: "production",
        refId: job.id,
      });
    }
    updated = {
      ...job,
      allocations: job.allocations.map((a) => ({
        ...a,
        allocated: 0,
        shortage: a.required,
      })),
      pendingProcurement: true,
      stage: "queued",
      updatedAt: nowIso(),
    };
    return {
      ...next,
      jobs: next.jobs.map((j) => (j.id === id ? updated! : j)),
    };
  });
  return updated;
}

export function listMovements(): StockMovement[] {
  return [...loadOpsWorkspace().movements];
}

/* ---------- Search ---------- */

export function searchOps(filters: OpsSearchFilters = {}): {
  items: InventoryItem[];
  jobs: ProductionJob[];
  procurements: ProcurementRequest[];
} {
  let items = listItems();
  let jobs = listProductionJobs();
  let procurements = listProcurements();

  if (filters.sku?.trim()) {
    const q = filters.sku.trim().toLowerCase();
    items = items.filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
  }
  if (filters.supplierId && filters.supplierId !== "all") {
    items = items.filter((i) => i.supplierId === filters.supplierId);
  }
  if (filters.category && filters.category !== "all") {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters.stockStatus && filters.stockStatus !== "all") {
    items = items.filter((i) => {
      const avail = availableStock(i);
      if (filters.stockStatus === "out") return avail <= 0;
      if (filters.stockStatus === "low") return avail > 0 && avail <= i.minStock;
      return avail > i.minStock;
    });
  }
  if (filters.material?.trim()) {
    const q = filters.material.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.category.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }
  if (filters.productionStage && filters.productionStage !== "all") {
    jobs = jobs.filter((j) => j.stage === filters.productionStage);
  }
  if (filters.procurementStage && filters.procurementStage !== "all") {
    procurements = procurements.filter((p) => p.stage === filters.procurementStage);
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    jobs = jobs.filter((j) => new Date(j.createdAt).getTime() >= from);
    procurements = procurements.filter((p) => new Date(p.createdAt).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    jobs = jobs.filter((j) => new Date(j.createdAt).getTime() <= to);
    procurements = procurements.filter((p) => new Date(p.createdAt).getTime() <= to);
  }

  return { items, jobs, procurements };
}
