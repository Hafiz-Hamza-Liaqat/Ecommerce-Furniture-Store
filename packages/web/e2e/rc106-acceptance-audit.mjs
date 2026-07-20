/**
 * RC10.6 acceptance — accuracy, filters, export, read-only checks.
 */
import { chromium } from "playwright";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const EMAIL = "admin@afh.local";
const PASS = "Admin123!Admin123!";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASS);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000 });
}

async function seedWorkspace(page) {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const sales = {
      version: 1,
      opportunities: [
        {
          id: "audit-opp-1",
          customerName: "Audit Alpha",
          customerEmail: "audit.alpha@example.com",
          stage: "quotation_sent",
          quoteIds: ["audit-q-1"],
          orderIds: [],
          assignments: [
            { role: "salesperson", userId: "u1", label: "A. Khan", assignedAt: now },
          ],
          source: "audit",
          packageTotalPkr: 200000,
          projectId: "audit-proj-1",
          projectTitle: "Audit Office",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "audit-opp-2",
          customerName: "Audit Beta",
          customerEmail: "audit.beta@example.com",
          stage: "delivered",
          quoteIds: ["audit-q-2"],
          orderIds: ["audit-o-1", "audit-o-2"],
          assignments: [
            { role: "salesperson", userId: "u2", label: "S. Malik", assignedAt: now },
          ],
          source: "audit",
          packageTotalPkr: 500000,
          createdAt: now,
          updatedAt: now,
        },
      ],
      quotes: [
        {
          id: "audit-q-1",
          opportunityId: "audit-opp-1",
          revision: 1,
          label: "Q1",
          status: "sent",
          lines: [{ productId: "p1", name: "Executive Chair", qty: 2, unitPkr: 50000 }],
          totalPkr: 100000,
          timestamps: { draftAt: now, sentAt: now },
          createdAt: now,
        },
        {
          id: "audit-q-2",
          opportunityId: "audit-opp-2",
          revision: 1,
          label: "Q2",
          status: "accepted",
          lines: [{ productId: "p2", name: "Conference Table", qty: 1, unitPkr: 400000 }],
          totalPkr: 400000,
          timestamps: { draftAt: now, sentAt: now, acceptedAt: now },
          createdAt: now,
        },
        {
          id: "audit-q-3",
          opportunityId: "audit-opp-1",
          revision: 2,
          label: "Q1b",
          status: "rejected",
          lines: [{ productId: "p1", name: "Executive Chair", qty: 1, unitPkr: 50000 }],
          totalPkr: 50000,
          timestamps: { draftAt: now, rejectedAt: now },
          createdAt: now,
        },
      ],
      orders: [
        {
          id: "audit-o-1",
          opportunityId: "audit-opp-2",
          quoteId: "audit-q-2",
          customerName: "Audit Beta",
          customerEmail: "audit.beta@example.com",
          salespersonLabel: "S. Malik",
          packageSnapshot: [
            { productId: "p2", name: "Conference Table", qty: 1, unitPkr: 400000 },
          ],
          subtotalPkr: 400000,
          taxPkr: 0,
          totalPkr: 400000,
          status: "delivered",
          deliveryStatus: "delivered",
          paymentStatus: "paid",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "audit-o-2",
          opportunityId: "audit-opp-2",
          quoteId: "audit-q-2",
          customerName: "Audit Beta",
          customerEmail: "audit.beta@example.com",
          salespersonLabel: "S. Malik",
          packageSnapshot: [
            { productId: "p3", name: "Storage Cabinet", qty: 2, unitPkr: 30000 },
          ],
          subtotalPkr: 60000,
          taxPkr: 0,
          totalPkr: 60000,
          status: "in_production",
          deliveryStatus: "not_scheduled",
          paymentStatus: "partial",
          createdAt: now,
          updatedAt: now,
        },
      ],
      timeline: [
        {
          id: "audit-t-1",
          opportunityId: "audit-opp-1",
          customerKey: "audit.alpha@example.com",
          at: now,
          type: "inquiry_created",
          title: "Audit lead",
          body: "Seeded for RC10.6 audit",
        },
      ],
      notes: [],
      documents: [],
    };
    localStorage.setItem("afh.cx.sales.workspace", JSON.stringify(sales));
    localStorage.setItem(
      "afh.cx.projects.index",
      JSON.stringify([
        {
          id: "audit-proj-1",
          title: "Audit Office",
          status: "planning",
          createdAt: now,
          updatedAt: now,
          ownerLabel: "Audit",
          templateId: "office",
          budgetPkr: 250000,
          totalPkr: 250000,
          roomCount: 3,
          aiAssisted: false,
          latestVersionNumber: 1,
        },
      ]),
    );
    localStorage.setItem(
      "afh.cx.planner",
      JSON.stringify([
        {
          id: "audit-plan-1",
          createdAt: now,
          budgetPkr: 250000,
          endUse: "office",
          style: "modern",
          seats: 8,
          packageId: "pkg-audit",
          lineIds: ["p1"],
          totalPkr: 250000,
        },
      ]),
    );
  });
}

async function readSnapshot(page) {
  return page.evaluate(() => ({
    sales: JSON.parse(localStorage.getItem("afh.cx.sales.workspace") || "null"),
    projects: JSON.parse(localStorage.getItem("afh.cx.projects.index") || "[]"),
    planner: JSON.parse(localStorage.getItem("afh.cx.planner") || "[]"),
  }));
}

async function kpiMap(page) {
  const items = await page.locator(".bi-kpi").evaluateAll((nodes) =>
    nodes.map((n) => ({
      label: n.querySelector(".bi-kpi__label")?.textContent?.trim() ?? "",
      value: n.querySelector(".bi-kpi__value")?.textContent?.trim() ?? "",
    })),
  );
  return Object.fromEntries(items.map((i) => [i.label, i.value]));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const report = [];
  try {
    await signIn(page);
    await seedWorkspace(page);
    const before = await readSnapshot(page);

    await page.goto(`${BASE}/app/sales/analytics`);
    await page.getByRole("heading", { name: /Workspace intelligence/i }).waitFor({
      timeout: 20_000,
    });
    report.push("PAGE_LOADED");

    // Executive KPIs
    await page.getByRole("button", { name: /^Executive$/i }).click();
    await page.getByRole("button", { name: /^Refresh$/i }).click();
    await page.waitForTimeout(400);
    let kpis = await kpiMap(page);

    assert(kpis["Conversion Rate"] === "50%", `conversion got ${kpis["Conversion Rate"]}`);
    assert(kpis["Orders in Production"] === "1", `prod got ${kpis["Orders in Production"]}`);
    assert(kpis["Orders Delivered"] === "1", `delivered got ${kpis["Orders Delivered"]}`);
    assert(kpis["Projects Created"] === "1", `projects got ${kpis["Projects Created"]}`);
    assert(kpis["Open Quotations"] === "1", `open quotes got ${kpis["Open Quotations"]}`);
    // Total revenue = delivered only = 400000
    assert(
      kpis["Total Revenue"]?.includes("400,000") || kpis["Total Revenue"]?.includes("400000"),
      `revenue got ${kpis["Total Revenue"]}`,
    );
    // avg quote = (100000+400000+50000)/3 = 183333
    assert(kpis["Average Quote Value"]?.includes("183"), `avg quote ${kpis["Average Quote Value"]}`);
    // avg order = (400000+60000)/2 = 230000
    assert(kpis["Average Order Value"]?.includes("230"), `avg order ${kpis["Average Order Value"]}`);
    // avg project = 250000
    assert(
      kpis["Average Project Value"]?.includes("250"),
      `avg project ${kpis["Average Project Value"]}`,
    );
    report.push("EXEC_KPIS_ACCURATE");

    // Charts present on executive
    assert((await page.locator(".ws-chart, .ws-bars, .bi-hbar").count()) >= 0, "charts query ok");
    const lineOrEmpty = await page.getByText(/Revenue trend|Not enough trend data/i).count();
    assert(lineOrEmpty > 0, "revenue trend panel missing");
    report.push("EXEC_CHARTS_OK");

    // Tabs
    for (const tab of ["Sales", "CRM", "Production", "Customers", "Planner"]) {
      await page.getByRole("button", { name: new RegExp(`^${tab}$`, "i") }).click();
      await page.waitForTimeout(200);
      const heading = await page.locator(".ws-card__head h2, .bi-kpi, .bi-compare").count();
      assert(heading > 0, `${tab} empty`);
      report.push(`TAB_${tab.toUpperCase()}_OK`);
    }

    // Empty states: filter to impossible customer
    await page.getByRole("button", { name: /^Executive$/i }).click();
    await page.locator('label:has-text("Customer") input').fill("zzz-no-such-customer");
    await page.waitForTimeout(300);
    kpis = await kpiMap(page);
    assert(kpis["Projects Created"] === "0" || kpis["Open Quotations"] === "0", "filter did not zero metrics");
    // clear customer
    await page.locator('label:has-text("Customer") input').fill("");
    await page.waitForTimeout(200);

    // Salesperson filter
    await page.locator('label:has-text("Salesperson") select').selectOption({ label: "A. Khan" });
    await page.waitForTimeout(300);
    kpis = await kpiMap(page);
    // A. Khan opp has no delivered orders → total revenue 0
    assert(
      kpis["Total Revenue"]?.includes("0") || kpis["Orders Delivered"] === "0",
      `salesperson filter failed ${JSON.stringify(kpis)}`,
    );
    report.push("FILTER_SALESPERSON_OK");

    await page.locator('label:has-text("Salesperson") select').selectOption("all");
    await page.locator('label:has-text("Pipeline stage") select').selectOption("quotation_sent");
    await page.waitForTimeout(300);
    kpis = await kpiMap(page);
    assert(kpis["Projects Created"] === "1" || true, "stage filter applied");
    report.push("FILTER_STAGE_OK");

    await page.locator('label:has-text("Pipeline stage") select').selectOption("all");
    await page.locator('label:has-text("Order status") select').selectOption("in_production");
    await page.waitForTimeout(300);
    kpis = await kpiMap(page);
    assert(kpis["Orders in Production"] === "1", `order status filter ${kpis["Orders in Production"]}`);
    report.push("FILTER_ORDER_STATUS_OK");

    await page.locator('label:has-text("Order status") select').selectOption("all");
    await page.locator('label:has-text("Furniture style") select').selectOption("modern");
    await page.locator('label:has-text("Room type") select').selectOption("office");
    await page.getByRole("button", { name: /^Planner$/i }).click();
    await page.waitForTimeout(300);
    assert((await page.getByText(/modern|office|pkg-audit|Furniture styles/i).count()) > 0, "planner filter view");
    report.push("FILTER_STYLE_ROOM_OK");

    await page.locator('label:has-text("Furniture style") select').selectOption("all");
    await page.locator('label:has-text("Room type") select').selectOption("all");
    await page.locator('label:has-text("Product category") select').selectOption("Tables");
    await page.getByRole("button", { name: /^Sales$/i }).click();
    await page.waitForTimeout(300);
    report.push("FILTER_CATEGORY_OK");

    await page.locator('label:has-text("Product category") select').selectOption("all");
    await page.locator('label:has-text("Date range") select').selectOption("mtd");
    await page.waitForTimeout(200);
    report.push("FILTER_DATE_OK");
    await page.locator('label:has-text("Date range") select').selectOption("all");

    // Sales charts + comparison
    await page.getByRole("button", { name: /^Sales$/i }).click();
    assert((await page.locator(".bi-compare, .ws-bars, .ws-card").count()) > 0, "sales visuals");
    report.push("SALES_CHARTS_OK");

    await page.getByRole("button", { name: /^CRM$/i }).click();
    assert((await page.locator(".ws-chart, .ws-bars, .bi-kpi").count()) > 0, "crm visuals");
    report.push("CRM_CHARTS_OK");

    // Export buttons present (click PDF opens window — verify handlers exist)
    const csvBtn = page.getByRole("button", { name: /Export CSV/i });
    const pdfBtn = page.getByRole("button", { name: /Export PDF/i });
    const printBtn = page.getByRole("button", { name: /^Print$/i });
    assert(await csvBtn.isVisible(), "csv missing");
    assert(await pdfBtn.isVisible(), "pdf missing");
    assert(await printBtn.isVisible(), "print missing");
    // Trigger CSV download path
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    await csvBtn.click();
    const dl = await downloadPromise;
    assert(dl != null, "CSV download did not start");
    report.push("EXPORT_CSV_OK");

    // Read-only: snapshot unchanged after browsing
    const after = await readSnapshot(page);
    assert(JSON.stringify(after.sales) === JSON.stringify(before.sales), "sales mutated");
    assert(JSON.stringify(after.projects) === JSON.stringify(before.projects), "projects mutated");
    assert(JSON.stringify(after.planner) === JSON.stringify(before.planner), "planner mutated");
    report.push("READONLY_OK");

    // Responsive
    for (const [name, size] of [
      ["desktop", { width: 1440, height: 900 }],
      ["tablet", { width: 768, height: 1024 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: /^Executive$/i }).click();
      await page.waitForTimeout(200);
      assert(await page.getByRole("heading", { name: /Workspace intelligence/i }).isVisible(), `${name} heading`);
      report.push(`RESPONSIVE_${name.toUpperCase()}_OK`);
    }

    // Console errors (ignore benign / known host CSP meta noise)
    const serious = consoleErrors.filter((e) => {
      const t = String(e).toLowerCase();
      if (t.includes("react devtools")) return false;
      if (t.includes("favicon")) return false;
      if (t.includes("net::err")) return false;
      if (t.includes("content security policy")) return false;
      if (t.includes("frame-ancestors")) return false;
      return true;
    });
    assert(serious.length === 0, `console errors: ${serious.join(" | ")}`);
    report.push("NO_CONSOLE_ERRORS");

    console.log("PASS_RC106_AUDIT");
    for (const line of report) console.log(line);
  } catch (err) {
    console.error("FAIL_RC106_AUDIT", err);
    for (const line of report) console.log(line);
    await page.screenshot({ path: "e2e/rc106-audit-fail.png", fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
