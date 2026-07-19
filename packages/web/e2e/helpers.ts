import { expect, type Page } from "@playwright/test";

export const SMOKE_EMAIL =
  process.env.AFH_E2E_EMAIL ?? "rc84.smoke@example.com";
export const SMOKE_PASSWORD =
  process.env.AFH_E2E_PASSWORD ?? "SmokeTest12!A";

export async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  const email = page.locator("#email");
  const password = page.locator("#password");
  await email.waitFor({ state: "visible" });
  await email.fill(SMOKE_EMAIL);
  await password.fill(SMOKE_PASSWORD);
  await expect(email).toHaveValue(SMOKE_EMAIL);
  await expect(password).toHaveValue(SMOKE_PASSWORD);

  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/auth/sign-in") &&
        res.request().method() === "POST",
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]).then(async ([res]) => {
    expect(res.ok(), `sign-in HTTP ${res.status()}`).toBeTruthy();
  });

  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  await expect(
    page
      .getByRole("heading")
      .or(page.getByText(/dashboard|workspace|sales|executive/i))
      .first(),
  ).toBeVisible({ timeout: 30_000 });
}
