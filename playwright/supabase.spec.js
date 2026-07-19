import { expect, test } from "@playwright/test";

test("the Supabase collection is the first homepage card and has its own filter", async ({
  page,
}) => {
  await page.goto("index.html");

  const integration = page.locator("[data-integration-card]");
  await expect(integration).toBeVisible();
  await expect(integration).toContainText("Supabase");
  await expect(integration).toContainText("2 templates");
  await expect(page.locator("#template-grid > article").first()).toHaveAttribute(
    "data-integration-card",
    "",
  );
  await expect(page.locator("#template-grid article.wrapper")).toHaveCount(18);
  await expect(page.locator("#template-result-count")).toHaveText(
    "18 templates · 1 collection",
  );

  await expect(page.getByRole("button", { name: "Auth" })).toHaveCount(0);

  await page.getByRole("button", { name: "Supabase" }).click();
  await expect(integration).toBeVisible();
  await expect(page.locator("#template-grid article.wrapper:visible")).toHaveCount(
    0,
  );
  await expect(page.locator("#template-result-count")).toHaveText(
    "1 collection",
  );
});

test("the collection presents production-ready templates without roadmap copy", async ({
  page,
}) => {
  await page.goto("supabase.html");

  await expect(
    page.getByRole("heading", { name: "Supabase Email Templates" }),
  ).toBeVisible();
  await expect(
    page.locator(".collection-template-grid article.wrapper"),
  ).toHaveCount(2);

  const confirmSignup = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Confirm Signup" }),
  });
  await expect(confirmSignup.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "supabase-confirm-signup.html",
  );

  const resetPassword = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Reset Password" }),
  });
  await expect(resetPassword.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "supabase-reset-password.html",
  );
  await expect(
    resetPassword.getByRole("link", { name: "Live Preview External Link" }),
  ).toHaveAttribute("href", "./preview.html?template=supabase-reset-password");
});

test("the collection opens the Supabase preview and its customizer", async ({
  page,
}) => {
  await page.goto("preview.html?template=supabase-confirm-signup");

  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});

test("the reset password template opens with Supabase copy support", async ({
  page,
}) => {
  await page.goto("preview.html?template=supabase-reset-password");

  await expect(
    page.getByText("Supabase Reset Password", { exact: true }),
  ).toBeVisible();
  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});
