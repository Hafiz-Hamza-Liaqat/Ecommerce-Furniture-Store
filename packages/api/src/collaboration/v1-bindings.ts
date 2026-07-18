/**
 * RC7.6 — V1 cross-module collaboration entity bindings.
 * Policy action strings are inlined to avoid circular deps between *-application packages.
 */
import type { CollaborationEntityBinding } from "@afh/application";

export const V1_COLLABORATION_BINDINGS: readonly CollaborationEntityBinding[] = [
  {
    allowedEntityType: "inventory.item",
    parent: {
      parentResourceType: "inventory_item",
      parentReadAction: "inventory.items.read",
      parentUpdateAction: "inventory.items.update",
    },
  },
  {
    allowedEntityType: "sales.opportunity",
    parent: {
      parentResourceType: "opportunity",
      parentReadAction: "sales.opportunities.read",
      parentUpdateAction: "sales.opportunities.update",
    },
  },
  {
    allowedEntityType: "sales.quote",
    parent: {
      parentResourceType: "quote",
      parentReadAction: "sales.quotes.read",
      parentUpdateAction: "sales.quotes.revise",
    },
  },
  {
    allowedEntityType: "sales.order",
    parent: {
      parentResourceType: "sales_order",
      parentReadAction: "sales.orders.read",
      parentUpdateAction: "sales.orders.create",
    },
  },
  {
    allowedEntityType: "procurement.purchase_requisition",
    parent: {
      parentResourceType: "requisition",
      parentReadAction: "procurement.requisitions.read",
      parentUpdateAction: "procurement.requisitions.submit",
    },
  },
  {
    allowedEntityType: "procurement.purchase_order",
    parent: {
      parentResourceType: "purchase_order",
      parentReadAction: "procurement.purchase_orders.read",
      parentUpdateAction: "procurement.purchase_orders.issue",
    },
  },
  {
    allowedEntityType: "projects.project",
    parent: {
      parentResourceType: "project",
      parentReadAction: "projects.projects.read",
      parentUpdateAction: "projects.projects.update",
    },
  },
  {
    allowedEntityType: "projects.task",
    parent: {
      parentResourceType: "task",
      parentReadAction: "projects.tasks.read",
      parentUpdateAction: "projects.tasks.update",
    },
  },
  {
    allowedEntityType: "service.work_order",
    parent: {
      parentResourceType: "work_order",
      parentReadAction: "service.work_orders.read",
      parentUpdateAction: "service.work_orders.update",
    },
  },
  {
    allowedEntityType: "crm.lead",
    parent: {
      parentResourceType: "lead",
      parentReadAction: "crm.leads.read",
      parentUpdateAction: "crm.leads.update",
    },
  },
  {
    allowedEntityType: "crm.contact",
    parent: {
      parentResourceType: "contact",
      parentReadAction: "crm.contacts.read",
      parentUpdateAction: "crm.contacts.update",
    },
  },
  {
    allowedEntityType: "crm.account",
    parent: {
      parentResourceType: "account",
      parentReadAction: "crm.accounts.read",
      parentUpdateAction: "crm.accounts.update",
    },
  },
] as const;
