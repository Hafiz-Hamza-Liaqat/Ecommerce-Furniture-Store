import type { EntityDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const FIELD_PERMISSIONS = {
  costsRead: "finance.costs.read",
  bankAccountsRead: "finance.bank_accounts.read",
} as const;

const filters = [
  { key: "account", label: "Account" },
  { key: "branch", label: "Branch", options: ["Lahore HQ", "Karachi Showroom", "Factory"] },
  { key: "department", label: "Department", options: ["Sales", "Ops", "Finance", "Plant"] },
  { key: "project", label: "Project" },
  { key: "currency", label: "Currency", options: ["PKR", "USD", "AED"] },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", options: ["Draft", "Posted", "Open", "Paid", "Void"] },
];

function e(partial: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...partial };
}

function moneyMinor(pkrMajor: number): { currencyCode: string; amountMinor: string } {
  return { currencyCode: "PKR", amountMinor: String(Math.round(pkrMajor * 100)) };
}

export const FINANCE_MODULE: ModuleDefinition = {
  id: "finance",
  title: "Finance",
  lead: "Accounts, invoices, payments, and ledgers via Finance Application — posting and tax stay server-side.",
  basePath: "/app/finance",
  summaryQueryType: "finance.GetFinancialSummary",
  buildSummaryPayload: (companyId) => ({ companyId }),
  kpis: [
    { label: "Revenue MTD", value: "₨ 48.2M", trend: 8.4, href: "invoices" },
    { label: "Open AR", value: "₨ 6.8M", trend: -2.1, href: "invoices" },
    { label: "Open AP", value: "₨ 3.2M", trend: 1.5, href: "bills" },
    { label: "Cash position", value: "₨ 11.4M", trend: 3.0, href: "cash-flow" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "accounts", label: "Accounts", entityKey: "accounts" },
    { to: "ledger", label: "Ledger", entityKey: "ledger" },
    { to: "journal", label: "Journal", entityKey: "journal" },
    { to: "invoices", label: "Invoices", entityKey: "invoices" },
    { to: "bills", label: "Bills", entityKey: "bills" },
    { to: "payments", label: "Payments", entityKey: "payments" },
    { to: "receipts", label: "Receipts", entityKey: "receipts" },
    { to: "expenses", label: "Expenses", entityKey: "expenses" },
    { to: "assets", label: "Assets", entityKey: "assets" },
    { to: "liabilities", label: "Liabilities", entityKey: "liabilities" },
    { to: "taxes", label: "Taxes", entityKey: "taxes" },
    { to: "budget", label: "Budget", entityKey: "budget" },
    { to: "forecast", label: "Forecast", entityKey: "forecast" },
    { to: "cash-flow", label: "Cash flow", entityKey: "cash-flow" },
    { to: "pnl", label: "Profit & loss", entityKey: "pnl" },
    { to: "balance-sheet", label: "Balance sheet", entityKey: "balance-sheet" },
    { to: "trial-balance", label: "Trial balance", entityKey: "trial-balance" },
    { to: "bank-rec", label: "Bank reconciliation", entityKey: "bank-rec" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "accounts",
      label: "Account",
      plural: "Accounts",
      description: "Chart of accounts.",
      columns: [
        { key: "title", label: "Account", sortable: true },
        { key: "status", label: "Status" },
        { key: "Code", label: "Code" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "accountType", label: "Type", type: "select", options: ["asset", "liability", "equity", "revenue", "expense"] },
      ],
      records: makeRows(
        "ACC",
        ["Cash at bank", "Accounts receivable", "Inventory asset", "Sales revenue", "COGS", "Accounts payable"],
        (i) => ({
          Code: `${1000 + i * 100}`,
          Type: ["asset", "asset", "asset", "revenue", "expense", "liability"][i]!,
        }),
      ),
      api: {
        createCommandType: "finance.CreateFinancialAccount",
        updateCommandType: "finance.UpdateFinancialAccount",
        getQueryType: "finance.GetFinancialAccount",
        listQueryType: "finance.ListFinancialAccount",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          code: v.code,
          name: v.name,
          accountType: v.accountType || "asset",
        }),
        buildUpdatePayload: (companyId, accountId, v) => ({
          companyId,
          accountId,
          code: v.code || null,
          name: v.name || null,
          accountType: v.accountType || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, accountId: id }),
        extractCreateId: (data) => (data as { accountId?: string }).accountId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; name?: string; code?: string; status?: string; accountType?: string };
          if (!d.id) return null;
          return row(d.id, d.name ?? d.id, d.status ?? "Active", {
            Code: d.code ?? "—",
            Type: d.accountType ?? "—",
          }, { source: "api" });
        },
      },
    }),
    e({
      key: "ledger",
      label: "Ledger",
      plural: "Ledgers",
      description: "General and sub-ledgers.",
      columns: [
        { key: "title", label: "Ledger" },
        { key: "status", label: "Status" },
        { key: "Currency", label: "Currency" },
        { key: "Entries", label: "Entries" },
      ],
      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "name", label: "Ledger name", type: "text", required: true },
        { name: "kind", label: "Kind", type: "select", options: ["general", "accounts_receivable", "accounts_payable", "commission", "other"], required: true },
        { name: "currencyCode", label: "Currency", type: "text", required: true },
      ],
      records: makeRows("LED", ["General ledger", "AR subledger", "AP subledger"], (i) => ({
        Currency: "PKR",
        Entries: 1200 + i * 340,
      })),
      api: {
        createCommandType: "finance.CreateLedger",
        getQueryType: "finance.GetLedger",
        listQueryType: "finance.ListLedger",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          code: v.code || `LED-${Date.now()}`,
          name: v.name,
          kind: v.kind || "general",
          currencyCode: v.currencyCode || "PKR",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, ledgerId: id, includeEntries: true }),
        extractCreateId: (data) => (data as { ledgerId?: string }).ledgerId ?? null,
        mapEntity: (data) => {
          const wrap = data as {
            ledger?: { id?: string; name?: string; code?: string; kind?: string; status?: string; currencyCode?: string };
          };
          const l =
            wrap.ledger ??
            (data as { id?: string; name?: string; code?: string; kind?: string; status?: string; currencyCode?: string });
          if (!l.id) return null;
          return row(
            l.id,
            l.name ?? l.code ?? l.id,
            l.status ?? "Open",
            { Currency: l.currencyCode ?? "PKR", Code: l.code ?? "—", Kind: l.kind ?? "—" },
            { source: "api" },
          );
        },
      },
    }),
    e({
      key: "journal",
      label: "Journal entry",
      plural: "Journal",
      description: "Manual journal lines (append via ledger commands).",
      columns: [
        { key: "title", label: "Entry" },
        { key: "status", label: "Status" },
        { key: "Debit", label: "Debit" },
        { key: "Credit", label: "Credit" },
      ],
      fields: [
        { name: "ledgerId", label: "Ledger ID", type: "text", required: true },
        { name: "accountId", label: "Account ID", type: "text", required: true },
        { name: "side", label: "Side", type: "select", options: ["debit", "credit"], required: true },
        { name: "amountMajor", label: "Amount (PKR)", type: "number", required: true },
        { name: "postingRef", label: "Posting ref", type: "text" },
      ],
      records: makeRows("JE", ["JE-9001 accrued rent", "JE-9010 depreciation", "JE-9022 FX reval"], (i) => ({
        Debit: `₨ ${(50_000 + i * 12_000).toLocaleString()}`,
        Credit: `₨ ${(50_000 + i * 12_000).toLocaleString()}`,
      })),
      api: {
        createCommandType: "finance.AppendLedgerEntry",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          ledgerId: v.ledgerId,
          accountId: v.accountId,
          side: v.side || "debit",
          amount: moneyMinor(Number(v.amountMajor || 0)),
          postingRef: v.postingRef || null,
        }),
        extractCreateId: (data) => (data as { entryId?: string }).entryId ?? `JE-${Date.now()}`,
      },
    }),
    e({
      key: "invoices",
      label: "Invoice",
      plural: "Invoices",
      description: "Customer invoices.",
      columns: [
        { key: "title", label: "Invoice", sortable: true },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "number", label: "Invoice number", type: "text", required: true },
        { name: "currencyCode", label: "Currency", type: "text", required: true },
        { name: "lineDescription", label: "Line description", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
        {
          name: "unitMajor",
          label: "Unit amount (PKR)",
          type: "number",
          required: true,
          permissionView: FIELD_PERMISSIONS.costsRead,
          permissionEdit: FIELD_PERMISSIONS.costsRead,
          sensitivity: "financial",
        },
      ],
      records: makeRows("INV", ["INV-9001", "INV-9014", "INV-9022", "INV-9031"], (i) => ({
        Customer: ["Indus Group", "Marina Hospitality", "Cedar Club", "Horizon Hotels"][i]!,
        Due: `2026-08-${10 + i}`,
        Currency: "PKR",
      })),
      api: {
        createCommandType: "finance.CreateInvoice",
        getQueryType: "finance.GetInvoice",
        listQueryType: "finance.ListInvoice",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          number: v.number,
          currencyCode: v.currencyCode || "PKR",
          lines: [
            {
              description: v.lineDescription || "Line",
              quantity: Number(v.quantity || 1),
              unitAmount: moneyMinor(Number(v.unitMajor || 0)),
            },
          ],
        }),
        buildGetPayload: (companyId, id) => ({ companyId, invoiceId: id, includeLines: true }),
        extractCreateId: (data) => (data as { invoiceId?: string }).invoiceId ?? null,
        mapEntity: (data) => {
          const wrap = data as { invoice?: { id?: string; number?: string; status?: string; currencyCode?: string } };
          const inv = wrap.invoice ?? (data as { id?: string; number?: string; status?: string; currencyCode?: string });
          if (!inv.id) return null;
          return row(inv.id, inv.number ?? inv.id, inv.status ?? "Draft", {
            Currency: inv.currencyCode ?? "PKR",
          }, { source: "api" });
        },
      },
    }),
    e({
      key: "bills",
      label: "Bill",
      plural: "Bills",
      description: "Supplier bills / AP.",
      columns: [
        { key: "title", label: "Bill" },
        { key: "status", label: "Status" },
        { key: "Supplier", label: "Supplier" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Bill number", type: "text", required: true },
        { name: "supplier", label: "Supplier", type: "text" },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("APB", ["APB-2201", "APB-2210", "APB-2218"], (i) => ({
        Supplier: ["Punjab Timber Co", "Coastal Hardware", "Loom & Weave"][i]!,
      })),
    }),
    e({
      key: "payments",
      label: "Payment",
      plural: "Payments",
      description: "Recorded payments against invoices.",
      columns: [
        { key: "title", label: "Payment" },
        { key: "status", label: "Status" },
        { key: "Invoice", label: "Invoice" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "invoiceId", label: "Invoice ID", type: "text", required: true },
        { name: "amountMajor", label: "Amount (PKR)", type: "number", required: true },
        {
          name: "methodId",
          label: "Payment method ID",
          type: "text",
          permissionView: FIELD_PERMISSIONS.bankAccountsRead,
          permissionEdit: FIELD_PERMISSIONS.bankAccountsRead,
          sensitivity: "restricted",
        },
        {
          name: "methodLabel",
          label: "Payment method label",
          type: "text",
          permissionView: FIELD_PERMISSIONS.bankAccountsRead,
          permissionEdit: FIELD_PERMISSIONS.bankAccountsRead,
          sensitivity: "restricted",
        },
        {
          name: "externalRef",
          label: "External payment reference",
          type: "text",
          permissionView: FIELD_PERMISSIONS.bankAccountsRead,
          permissionEdit: FIELD_PERMISSIONS.bankAccountsRead,
          sensitivity: "restricted",
        },
      ],
      records: makeRows("PAY", ["PAY-7701", "PAY-7712"], (i) => ({
        Invoice: `INV-90${14 + i}`,
        Method: "Bank transfer",
      })),
      api: {
        createCommandType: "finance.RecordPayment",
        getQueryType: "finance.GetPayment",
        listQueryType: "finance.ListPayment",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          invoiceId: v.invoiceId,
          amount: moneyMinor(Number(v.amountMajor || 0)),
          methodId: v.methodId || null,
          methodLabel: v.methodLabel || null,
          externalRef: v.externalRef || null,
        }),
        buildGetPayload: (companyId, id) => ({ companyId, paymentId: id }),
        extractCreateId: (data) => (data as { paymentId?: string }).paymentId ?? null,
        mapEntity: (data) => {
          const d = data as { id?: string; status?: string; invoiceId?: string };
          if (!d.id) return null;
          return row(d.id, d.id, d.status ?? "Posted", { Invoice: d.invoiceId ?? "—" }, { source: "api" });
        },
      },
    }),
    e({
      key: "receipts",
      label: "Receipt",
      plural: "Receipts",
      description: "Cash / bank receipts register.",
      columns: [
        { key: "title", label: "Receipt" },
        { key: "status", label: "Status" },
        { key: "Customer", label: "Customer" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Receipt ref", type: "text", required: true },
        { name: "amount", label: "Amount", type: "currency" },
      ],
      records: makeRows("RCT", ["RCT-501", "RCT-518"], (i) => ({
        Customer: ["Indus Group", "Marina Hospitality"][i]!,
      })),
    }),
    e({
      key: "expenses",
      label: "Expense",
      plural: "Expenses",
      description: "Operating expenses.",
      columns: [
        { key: "title", label: "Expense" },
        { key: "status", label: "Status" },
        { key: "Department", label: "Department" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Expense", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["Sales", "Ops", "Finance", "Plant"] },
      ],
      records: makeRows("EXP", ["Factory utilities", "Showroom rent", "Logistics fuel"], (i) => ({
        Department: ["Plant", "Sales", "Ops"][i]!,
      })),
    }),
    e({
      key: "assets",
      label: "Asset",
      plural: "Assets",
      description: "Fixed and current asset register presentation.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Class", label: "Class" },
        { key: "amount", label: "Book value" },
      ],
      fields: [
        { name: "title", label: "Asset", type: "text", required: true },
        { name: "class", label: "Class", type: "select", options: ["Current", "Fixed", "Intangible"] },
      ],
      records: makeRows("AST", ["CNC router line", "Delivery fleet", "Trade receivables"], (i) => ({
        Class: ["Fixed", "Fixed", "Current"][i]!,
      })),
    }),
    e({
      key: "liabilities",
      label: "Liability",
      plural: "Liabilities",
      description: "Liability register presentation.",
      columns: [
        { key: "title", label: "Liability" },
        { key: "status", label: "Status" },
        { key: "Class", label: "Class" },
        { key: "amount", label: "Balance" },
      ],
      fields: [
        { name: "title", label: "Liability", type: "text", required: true },
        { name: "class", label: "Class", type: "select", options: ["Current", "Long-term"] },
      ],
      records: makeRows("LIA", ["Trade payables", "Short-term loan", "Lease liability"], (i) => ({
        Class: i ? "Long-term" : "Current",
      })),
    }),
    e({
      key: "taxes",
      label: "Tax record",
      plural: "Taxes",
      description: "Tax filings presentation — calculation remains Rules/backend.",
      columns: [
        { key: "title", label: "Filing" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Filing", type: "text", required: true },
        { name: "period", label: "Period", type: "text" },
      ],
      records: makeRows("TAX", ["Sales tax Jul", "Withholding Jul"], (i) => ({
        Period: "2026-07",
        Authority: i ? "FBR WHT" : "FBR ST",
      })),
    }),
    e({
      key: "budget",
      label: "Budget line",
      plural: "Budget",
      description: "Budget vs actual presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Cost center" },
        { key: "status", label: "Period" },
        { key: "Budget", label: "Budget" },
        { key: "Actual", label: "Actual" },
      ],
      fields: [{ name: "title", label: "Cost center", type: "text", required: true }],
      records: makeRows("BUD", ["Plant materials", "Sales opex", "Capex CNC"], (i) => ({
        Budget: `₨ ${(1_000_000 + i * 400_000).toLocaleString()}`,
        Actual: `₨ ${(820_000 + i * 350_000).toLocaleString()}`,
      })),
    }),
    e({
      key: "forecast",
      label: "Forecast line",
      plural: "Forecast",
      description: "Financial forecast presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Line" },
        { key: "status", label: "Horizon" },
        { key: "Value", label: "Forecast" },
      ],
      fields: [{ name: "title", label: "Line", type: "text", required: true }],
      records: makeRows("FF", ["Revenue", "Gross margin", "OpEx"], (i) => ({
        Value: [`₨ 52M`, `34%`, `₨ 9.1M`][i]!,
      })),
    }),
    e({
      key: "cash-flow",
      label: "Cash flow line",
      plural: "Cash flow",
      description: "Cash flow statement presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Section" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Amount" },
      ],
      fields: [{ name: "title", label: "Section", type: "text", required: true }],
      records: makeRows("CF", ["Operating", "Investing", "Financing"], (i) => ({
        Value: [`₨ 4.2M`, `₨ -1.1M`, `₨ 0.4M`][i]!,
      })),
    }),
    e({
      key: "pnl",
      label: "P&L line",
      plural: "Profit & loss",
      description: "P&L statement presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Line" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Amount" },
      ],
      fields: [{ name: "title", label: "Line", type: "text", required: true }],
      records: makeRows("PNL", ["Revenue", "COGS", "Gross profit", "Net profit"], (i) => ({
        Value: [`₨ 48.2M`, `₨ 32.1M`, `₨ 16.1M`, `₨ 9.4M`][i]!,
      })),
    }),
    e({
      key: "balance-sheet",
      label: "Balance sheet line",
      plural: "Balance sheet",
      description: "Balance sheet presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Line" },
        { key: "status", label: "As of" },
        { key: "Value", label: "Amount" },
      ],
      fields: [{ name: "title", label: "Line", type: "text", required: true }],
      records: makeRows("BS", ["Total assets", "Total liabilities", "Equity"], (i) => ({
        Value: [`₨ 86M`, `₨ 31M`, `₨ 55M`][i]!,
      })),
    }),
    e({
      key: "trial-balance",
      label: "Trial balance row",
      plural: "Trial balance",
      description: "Trial balance presentation.",
      analytics: true,
      columns: [
        { key: "title", label: "Account" },
        { key: "status", label: "Status" },
        { key: "Debit", label: "Debit" },
        { key: "Credit", label: "Credit" },
      ],
      fields: [{ name: "title", label: "Account", type: "text", required: true }],
      records: makeRows("TB", ["Cash at bank", "Sales revenue", "COGS"], (i) => ({
        Debit: i === 2 ? "₨ 32.1M" : i === 0 ? "₨ 11.4M" : "—",
        Credit: i === 1 ? "₨ 48.2M" : "—",
      })),
    }),
    e({
      key: "bank-rec",
      label: "Bank rec item",
      plural: "Bank reconciliation",
      description: "Bank reconciliation worksheet.",
      columns: [
        { key: "title", label: "Item" },
        { key: "status", label: "Status" },
        { key: "Bank", label: "Bank" },
        { key: "amount", label: "Amount" },
      ],
      fields: [
        { name: "title", label: "Item", type: "text", required: true },
        { name: "bank", label: "Bank", type: "text" },
      ],
      records: makeRows("BR", ["Unpresented cheque", "Deposit in transit", "Bank charge"], () => ({
        Bank: "HBL Operating",
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "Financial analytics",
      description: "Financial analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("FA", ["Gross margin", "DSO", "DPO"], (i) => ({
        Value: ["33.4%", "28d", "22d"][i]!,
      })),
    }),
  ],
};
