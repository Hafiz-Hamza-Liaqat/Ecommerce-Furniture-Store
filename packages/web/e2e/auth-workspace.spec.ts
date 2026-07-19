import { expect, test } from "./fixtures";
import { signIn, SMOKE_EMAIL } from "./helpers";

const authConfigured = Boolean(SMOKE_EMAIL);

test.describe("Authenticated workspace journeys", () => {
  // Avoid parallel sign-in races against the shared smoke account.
  test.describe.configure({ mode: "serial" });
  test.skip(!authConfigured, "AFH_E2E_EMAIL not configured");

  test("login → dashboard without React error boundary", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await signIn(page);

    await expect(
      page.getByText(/unexpected application error/i),
    ).toHaveCount(0);
    expect(
      pageErrors.filter((m) => /useState|Invalid hook call/i.test(m)),
    ).toEqual([]);
  });

  test("dashboard and notifications surfaces", async ({ page }) => {
    await signIn(page);

    await page.goto("/app");
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/notifications");
    await expect(page).toHaveURL(/notifications/);

    await page.goto("/app/reports");
    await expect(page).toHaveURL(/reports/);
  });

  test("search module workspace", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/search");
    await expect(page).toHaveURL(/search/);
  });

  test("CRM list surface (CRUD shell)", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/crm");
    await expect(page).toHaveURL(/crm/);
    await expect(
      page.getByText(/unexpected application error/i),
    ).toHaveCount(0);
  });
});
