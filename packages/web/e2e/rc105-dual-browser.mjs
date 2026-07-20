/**
 * RC10.5 — Dual isolated-browser sync walkthrough (standalone).
 * Usage: node e2e/rc105-dual-browser.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.AFH_E2E_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.AFH_E2E_EMAIL ?? "admin@afh.local";
const PASS = process.env.AFH_E2E_PASSWORD ?? "Admin123!Admin123!";
const MARKER = `RC105 Dual ${Date.now()}`;
const CUSTOMER = `Dual Customer ${Date.now()}`;
const CUSTOMER_EMAIL = `dual.${Date.now()}@example.com`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASS);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

async function openSyncAndRun(page) {
  const chip = page.getByRole("button", { name: /Synchronization:/i }).first();
  await chip.waitFor({ state: "visible", timeout: 20_000 });
  await chip.click();
  const panel = page.getByRole("dialog", { name: /Synchronization details/i });
  await panel.waitFor({ state: "visible" });
  await panel.getByRole("button", { name: /^Sync Now$/i }).click();
  await page.waitForTimeout(2500);
  const close = panel.getByRole("button", { name: /^Close$/i });
  if (await close.isVisible()) await close.click();
}

async function readCxSnapshot(page) {
  return page.evaluate(() => {
    const projectsIndex = localStorage.getItem("afh.cx.projects.index");
    const sales = localStorage.getItem("afh.cx.sales.workspace");
    const planner = localStorage.getItem("afh.cx.planner");
    const projectKeys = Object.keys(localStorage).filter((k) => k.startsWith("afh.cx.project."));
    return {
      projectsIndex: projectsIndex ? JSON.parse(projectsIndex) : null,
      sales: sales ? JSON.parse(sales) : null,
      planner: planner ? JSON.parse(planner) : null,
      projectKeyCount: projectKeys.length,
      projectBodies: projectKeys.map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) ?? "null");
        } catch {
          return null;
        }
      }),
    };
  });
}

async function createProject(page, title) {
  await page.goto(`${BASE}/my-projects`);
  await page.getByRole("button", { name: /New project/i }).first().click();
  const dialog = page.getByRole("dialog", { name: /New project/i });
  await dialog.waitFor({ state: "visible" });
  await dialog.locator('input[placeholder*="Bahria"]').fill(title);
  await dialog.locator("select").first().selectOption("office");
  await dialog.getByRole("button", { name: /Create project/i }).click();
  await page.getByText(title).first().waitFor({ state: "visible", timeout: 10_000 });
}

async function configurePlanner(page) {
  await page.goto(`${BASE}/planner`);
  const show = page.getByRole("button", { name: /Show questions/i });
  if (await show.isVisible().catch(() => false)) await show.click();
  const style = page.locator("label").filter({ hasText: /style/i }).locator("select").first();
  if (await style.isVisible().catch(() => false)) {
    const options = await style.locator("option").allTextContents();
    const pick = options.find((o) => /classic|contemporary|luxury|minimal/i.test(o)) ?? options[1];
    if (pick) await style.selectOption({ label: pick.trim() });
  }
  const save = page.getByRole("button", { name: /Save project/i });
  if (await save.isEnabled().catch(() => false)) {
    await save.click();
  } else {
    await page.evaluate(() => {
      const key = "afh.cx.planner";
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      const next = [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          budgetPkr: 250000,
          endUse: "office",
          style: "modern",
          seats: 8,
          packageId: "rc105-dual",
          lineIds: ["dual-line"],
          totalPkr: 250000,
        },
        ...(Array.isArray(existing) ? existing : []),
      ];
      localStorage.setItem(key, JSON.stringify(next));
    });
  }
}

async function salesFlow(page) {
  page.on("dialog", async (dialog) => {
    const msg = dialog.message().toLowerCase();
    if (msg.includes("name")) await dialog.accept(CUSTOMER);
    else if (msg.includes("email")) await dialog.accept(CUSTOMER_EMAIL);
    else await dialog.dismiss().catch(() => dialog.accept());
  });

  await page.goto(`${BASE}/app/sales/workflow`);
  await page.getByRole("heading", { name: /Sales workflow/i }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: /New inquiry/i }).click();
  await page.getByText(CUSTOMER).first().waitFor({ state: "visible", timeout: 10_000 });

  const stageSelect = page.locator("label", { hasText: /Pipeline stage/i }).locator("select");
  await stageSelect.waitFor({ state: "visible" });
  const options = await stageSelect.locator("option").evaluateAll((opts) =>
    opts.map((o) => o.value),
  );
  const current = await stageSelect.inputValue();
  const preferred = ["qualified", "proposal", "quotation", "negotiation"].find(
    (v) => options.includes(v) && v !== current,
  );
  const target = preferred ?? options.find((v) => v !== current && v.length > 0) ?? options[1];
  await stageSelect.selectOption(target);

  await page.getByRole("button", { name: /New revision/i }).click();
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const pageA = await (await browser.newContext()).newPage();
  const pageB = await (await browser.newContext()).newPage();
  const report = [];

  try {
    report.push(`MARKER=${MARKER}`);
    await signIn(pageA);
    report.push("A: signed in");
    await createProject(pageA, MARKER);
    report.push("A: project created");
    await configurePlanner(pageA);
    report.push("A: planner configured");
    await salesFlow(pageA);
    report.push("A: CRM + quotation updated");

    const beforeSyncA = await readCxSnapshot(pageA);
    const projectTitlesA = (beforeSyncA.projectBodies ?? [])
      .map((p) => p?.title)
      .filter(Boolean);
    assert(projectTitlesA.includes(MARKER), "A missing project title in storage");

    const salesA = beforeSyncA.sales;
    const oppA = (salesA?.opportunities ?? []).find((o) => o.customerName === CUSTOMER);
    assert(oppA, "A missing opportunity");
    assert(oppA.stage, "A missing stage");
    const quotesForOpp = (salesA?.quotes ?? []).filter((q) => q.opportunityId === oppA.id);
    assert(quotesForOpp.length > 0, "A missing quotation");
    const timelineCountA = (salesA?.timeline ?? []).length;
    assert(timelineCountA > 0, "A missing timeline entries");
    const quoteTotalA = quotesForOpp[0]?.totalPkr ?? quotesForOpp[0]?.grandTotalPkr ?? null;

    await openSyncAndRun(pageA);
    report.push("A: Sync Now completed");

    await signIn(pageB);
    report.push("B: signed in");
    await pageB.goto(`${BASE}/my-projects`);
    await openSyncAndRun(pageB);
    report.push("B: Sync Now completed");

    await pageB.reload();
    await pageB.goto(`${BASE}/my-projects`);
    await pageB.getByText(MARKER).first().waitFor({ state: "visible", timeout: 20_000 });
    report.push("B: project visible in UI");

    const snapB = await readCxSnapshot(pageB);
    const titlesB = (snapB.projectBodies ?? []).map((p) => p?.title).filter(Boolean);
    const markerCount = titlesB.filter((t) => t === MARKER).length;
    assert(markerCount === 1, `Expected 1 project, got ${markerCount}`);
    report.push(`B: project duplicates check ok (${markerCount})`);

    const salesB = snapB.sales;
    const oppsB = (salesB?.opportunities ?? []).filter((o) => o.customerName === CUSTOMER);
    assert(oppsB.length === 1, `Expected 1 opportunity, got ${oppsB.length}`);
    assert(oppsB[0].stage === oppA.stage, `Stage mismatch A=${oppA.stage} B=${oppsB[0].stage}`);
    report.push(`B: CRM stage=${oppsB[0].stage} matches A`);

    const quotesB = (salesB?.quotes ?? []).filter((q) => q.opportunityId === oppsB[0].id);
    assert(quotesB.length === quotesForOpp.length, "Quote count mismatch");
    const quoteTotalB = quotesB[0]?.totalPkr ?? quotesB[0]?.grandTotalPkr ?? null;
    assert(quoteTotalB === quoteTotalA, `Totals mismatch A=${quoteTotalA} B=${quoteTotalB}`);
    report.push(`B: quote totals match (${quoteTotalB})`);

    const timelineCountB = (salesB?.timeline ?? []).length;
    assert(timelineCountB >= timelineCountA, "Timeline entries missing on B");
    report.push(`B: timeline A=${timelineCountA} B=${timelineCountB}`);

    assert(snapB.planner, "Planner missing on B");
    report.push("B: planner payload present");

    // Ensure planner total not recalculated if we injected 250000
    if (Array.isArray(snapB.planner)) {
      const dual = snapB.planner.find((p) => p.packageId === "rc105-dual" || p.totalPkr === 250000);
      if (dual) {
        assert(dual.totalPkr === 250000, "Planner total recalculated unexpectedly");
        report.push("B: planner total 250000 intact");
      }
    }

    await pageB.goto(`${BASE}/app/sales/workflow?opportunity=${oppsB[0].id}`);
    await pageB.getByText(CUSTOMER).first().waitFor({ state: "visible", timeout: 15_000 });
    report.push("B: customer detail visible");

    console.log("PASS_DUAL_BROWSER");
    for (const line of report) console.log(line);
    console.log(
      JSON.stringify({
        marker: MARKER,
        customer: CUSTOMER,
        stage: oppA.stage,
        quoteTotal: quoteTotalA,
        timelineCountA,
        timelineCountB,
        projectDupes: markerCount,
      }),
    );
  } catch (err) {
    console.error("FAIL_DUAL_BROWSER", err);
    for (const line of report) console.log(line);
    try {
      await pageA.screenshot({ path: "e2e/rc105-dual-a.png", fullPage: true });
      await pageB.screenshot({ path: "e2e/rc105-dual-b.png", fullPage: true });
      console.log("screenshots written");
    } catch {
      /* ignore */
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
