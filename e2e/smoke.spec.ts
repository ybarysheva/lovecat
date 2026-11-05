import { expect, test } from "@playwright/test";

// The cat is always gently moving, so clicks skip Playwright's "stable" check.
const press = { force: true } as const;

test("the demo cat: pet it, give it a treat, play with the laser", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".cat-label")).toHaveText("[ pet the cat to receive love ]");

  await page.locator("[data-squish]").click(press);
  await expect(page.locator("[data-bubble-text]")).not.toBeEmpty();

  await page.locator("[data-treat]").click(press);
  await expect(page.locator(".heart-particle").first()).toBeAttached({ timeout: 3000 });

  await page.locator("[data-laser]").click(press);
  await expect(page.locator(".laser-dot")).toHaveCount(1);
  await page.locator("[data-laser]").click(press);
  await expect(page.locator(".laser-dot")).toHaveCount(0);
});

test("make a cat, then open its link", async ({ page }) => {
  await page.goto("/make");

  // Nothing filled in: errors appear under the fields.
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page.locator("#to-error")).toHaveText("Add who the cat is for.");
  await expect(page.locator("#notes-error")).toHaveText("Add at least one note.");

  await page.getByLabel("Their name").fill("Alex");
  await page.getByLabel("Your name").fill("Sam");
  await page.getByPlaceholder("Write your own note…").fill("You are my favorite human");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "I love you", exact: true }).click();
  await page.getByRole("button", { name: "Create link" }).click();

  await expect(page.getByRole("heading", { name: "Alex's cat is ready" })).toBeVisible();
  const link = (await page.locator(".link-box").textContent())!;
  expect(link).toMatch(/\/c\/[a-z0-9]{10}$/);

  await page.goto(link);
  await expect(page).toHaveTitle("A cat for Alex");
  await expect(page.locator(".cat-from")).toHaveText("a message from Sam for Alex");
  await page.locator("[data-squish]").click(press);
  await expect(page.locator("[data-bubble-text]")).toHaveText(/You are my favorite human|I love you/);
});

test("a link that doesn't exist shows the not-found page", async ({ page }) => {
  const res = await page.goto("/c/zzzzzzzzzz");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This cat wandered off" })).toBeVisible();
});
