import { expect, test } from "./fixtures";

test.describe("Customer journeys", () => {
  test("homepage → category → product → wishlist → compare", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible();

    await page.goto("/furniture/living-room/sofas", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/sofas/);

    await page.goto("/products/meridian-sofa", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/meridian-sofa/);
    await expect(page.getByRole("heading").first()).toBeVisible();

    const wishlist = page.getByRole("button", { name: /wishlist|save|heart/i });
    if (await wishlist.count()) {
      await wishlist.first().click();
    }

    await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/wishlist/);

    await page.goto("/compare", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/compare/);
  });

  test("budget planner loads", async ({ page }) => {
    await page.goto("/planner", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/planner/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("AI consultant loads", async ({ page }) => {
    await page.goto("/consultant", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/consultant/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("search / products catalog loads", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/products/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("login page is reachable and form is present", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("404 surface for unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-afh", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText(/not found|page not found|404/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
