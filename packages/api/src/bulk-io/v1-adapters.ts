/**
 * RC7.7 bulk I/O adapters — domain modules remain aggregate owners.
 */

import type { BulkIoEntityAdapter } from "@afh/application";
import type { InventoryItem, InventoryRepository } from "@afh/inventory";
import type { Lead, LeadRepository } from "@afh/crm";
import type { Supplier, SupplierRepository } from "@afh/procurement";
import { NotFoundError, ValidationError, fail, ok } from "@afh/shared-kernel";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function newId(): string {
  return crypto.randomUUID();
}

export function createInventoryItemBulkAdapter(
  items: InventoryRepository,
): BulkIoEntityAdapter {
  return {
    async importRow({ companyId, row, nowIso }) {
      const code = asString(row.code);
      const name = asString(row.name);
      if (!code || !name) {
        return fail(
          new ValidationError("code and name are required", {
            code: "bulk_row_invalid",
          }),
        );
      }
      const id = newId();
      const item: InventoryItem = {
        id,
        companyId,
        code,
        name,
        skuRef: {
          sku: asString(row.sku) ?? code,
          productId: null,
          variantId: null,
        },
        status: "draft",
        classification: "finished_good",
        itemType: "stocked",
        defaultUnitCode: asString(row.defaultUnitCode),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const saved = await items.save(item);
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async updateRow({ companyId, id, patch, expectedVersion, nowIso }) {
      const found = await items.findByIdWithVersion({ companyId, id });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Inventory item not found", {
            code: "inventory_item_not_found",
          }),
        );
      }
      const existing = found.value.entity;
      const updated: InventoryItem = {
        ...existing,
        name: asString(patch.name) ?? existing.name,
        updatedAt: nowIso,
      };
      const saved = await items.save(
        updated,
        expectedVersion !== undefined ? { expectedVersion } : undefined,
      );
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async exportRows({ companyId, limit }) {
      const page = await items.listByCompany(companyId, {
        page: 1,
        pageSize: limit,
      });
      if (!page.ok) return page;
      return ok(
        page.value.items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          status: item.status,
          sku: item.skuRef.sku,
        })),
      );
    },
  };
}

export function createCrmLeadBulkAdapter(leads: LeadRepository): BulkIoEntityAdapter {
  return {
    async importRow({ companyId, row, nowIso }) {
      const title = asString(row.title) ?? asString(row.code);
      if (!title) {
        return fail(
          new ValidationError("title or code is required", {
            code: "bulk_row_invalid",
          }),
        );
      }
      const id = newId();
      const lead: Lead = {
        id,
        companyId,
        code: asString(row.code),
        title,
        status: "new",
        classification: null,
        source: null,
        contactId: null,
        accountId: null,
        ownerUserId: null,
        salesCustomerId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const saved = await leads.save(lead);
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async updateRow({ companyId, id, patch, nowIso }) {
      const found = await leads.findById({ companyId, id });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Lead not found", { code: "lead_not_found" }),
        );
      }
      const updated: Lead = {
        ...found.value,
        title: asString(patch.title) ?? found.value.title,
        updatedAt: nowIso,
      };
      const saved = await leads.save(updated);
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async exportRows({ companyId, limit }) {
      const page = await leads.listByCompany(companyId, {
        page: 1,
        pageSize: limit,
      });
      if (!page.ok) return page;
      return ok(
        page.value.items.map((lead) => ({
          id: lead.id,
          code: lead.code,
          title: lead.title,
          status: lead.status,
        })),
      );
    },
  };
}

export function createSupplierBulkAdapter(
  suppliers: SupplierRepository,
): BulkIoEntityAdapter {
  return {
    async importRow({ companyId, row, nowIso }) {
      const code = asString(row.code);
      const name = asString(row.name);
      if (!code || !name) {
        return fail(
          new ValidationError("code and name are required", {
            code: "bulk_row_invalid",
          }),
        );
      }
      const id = newId();
      const supplier: Supplier = {
        id,
        companyId,
        code,
        name,
        identityOrganizationId: null,
        categoryId: null,
        status: "draft",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const saved = await suppliers.save(supplier);
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async updateRow({ companyId, id, patch, nowIso }) {
      const found = await suppliers.findById({ companyId, id });
      if (!found.ok) return found;
      if (!found.value) {
        return fail(
          new NotFoundError("Supplier not found", {
            code: "supplier_not_found",
          }),
        );
      }
      const updated: Supplier = {
        ...found.value,
        name: asString(patch.name) ?? found.value.name,
        updatedAt: nowIso,
      };
      const saved = await suppliers.save(updated);
      if (!saved.ok) return saved;
      return ok({ entityId: id });
    },
    async exportRows({ companyId, limit }) {
      const page = await suppliers.listByCompany(companyId, {
        page: 1,
        pageSize: limit,
      });
      if (!page.ok) return page;
      return ok(
        page.value.items.map((supplier) => ({
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          status: supplier.status,
        })),
      );
    },
  };
}
