import { expect, test } from "@playwright/test";

test("the Supabase collection is discoverable without becoming a homepage template card", async ({
  page,
}) => {
  await page.goto("index.html");

  const integration = page.locator("[data-integration-card]");
  await expect(integration).toBeVisible();
  await expect(integration).toContainText("Supabase Email Templates");
  await expect(page.locator("#template-grid article.wrapper")).toHaveCount(18);
  await expect(page.locator("#template-result-count")).toHaveText("19 templates");

  await page.getByRole("button", { name: "Auth" }).click();
  await expect(integration).toBeVisible();

  await page.getByRole("button", { name: "Ecommerce" }).click();
  await expect(integration).toBeHidden();
});

test("the collection presents one production-ready template without roadmap copy", async ({
  page,
}) => {
  await page.goto("supabase.html");

  await expect(
    page.getByRole("heading", { name: "Supabase Email Templates" }),
  ).toBeVisible();
  await expect(
    page.locator(".collection-template-grid article.wrapper"),
  ).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "supabase-confirm-signup.html",
  );
  await expect(
    page.getByRole("link", { name: "Live Preview External Link" }),
  ).toHaveAttribute("href", "./preview.html?template=supabase-confirm-signup");
});

test("the collection opens the Supabase preview and its customizer", async ({
  page,
}) => {
  await page.goto("preview.html?template=supabase-confirm-signup");

  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});
