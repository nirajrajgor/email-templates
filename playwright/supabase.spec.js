import { expect, test } from "@playwright/test";

test("the Supabase collection is the first homepage card and has its own filter", async ({
  page,
}) => {
  await page.goto("index.html");

  const integration = page.locator("[data-integration-card]");
  await expect(integration).toBeVisible();
  await expect(integration).toContainText("Supabase");
  await expect(integration).toContainText("4 templates");
  await expect(page.locator("#template-grid > article").first()).toHaveAttribute(
    "data-integration-card",
    "",
  );
  await expect(page.locator("#template-grid article.wrapper")).toHaveCount(18);
  await expect(page.locator("#template-result-count")).toHaveText(
    "18 templates · 1 collection",
  );

  await expect(page.getByRole("button", { name: "Auth" })).toHaveCount(0);

  const search = page.getByRole("searchbox", { name: "Search templates" });
  await search.fill("View collection");
  await expect(integration).toBeHidden();
  await search.fill("");
  await expect(integration).toBeVisible();

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
  ).toHaveCount(4);

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

  const magicLink = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Magic Link" }),
  });
  await expect(magicLink.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "supabase-magic-link.html",
  );
  await expect(
    magicLink.getByRole("link", { name: "Live Preview External Link" }),
  ).toHaveAttribute("href", "./preview.html?template=supabase-magic-link");

  const emailOtp = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Email OTP" }),
  });
  await expect(emailOtp.getByRole("link", { name: "Download" })).toHaveAttribute(
    "download",
    "supabase-email-otp.html",
  );
  await expect(
    emailOtp.getByRole("link", { name: "Live Preview External Link" }),
  ).toHaveAttribute("href", "./preview.html?template=supabase-email-otp");
});

test("the collection opens the Supabase preview and its customizer", async ({
  page,
}) => {
  await page.goto("preview.html?template=supabase-confirm-signup");

  await expect(page.locator("#back-link")).toHaveAttribute(
    "aria-label",
    "Back to Supabase templates",
  );
  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});

test("Supabase cards keep square previews while compact emails remain fully visible", async ({
  page,
}) => {
  await page.goto("supabase.html");

  const previews = page.locator(
    '.collection-template-grid article.wrapper > div[class*="aspect-"]',
  );
  await expect(previews).toHaveCount(4);

  const previewStates = await previews.evaluateAll((nodes) =>
    nodes.map((node) => {
      const image = node.querySelector("img");
      const bounds = node.getBoundingClientRect();
      return {
        height: bounds.height,
        scrollable: node.dataset.previewScrollable,
        width: bounds.width,
        imageHeight: image?.getBoundingClientRect().height,
      };
    }),
  );

  previewStates.forEach(({ height, imageHeight, scrollable, width }) => {
    expect(Math.abs(width - height)).toBeLessThan(1);
    expect(imageHeight).toBeLessThanOrEqual(height);
    expect(scrollable).toBe("false");
  });
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

for (const [templateId, title, emailHeading] of [
  ["supabase-magic-link", "Supabase Magic Link", "Your sign-in link"],
  ["supabase-email-otp", "Supabase Email OTP", "Your verification code"],
]) {
  test(`${templateId} opens with Supabase copy support`, async ({ page }) => {
    await page.goto(`preview.html?template=${templateId}`);

    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(
      page
        .frameLocator("#template-frame")
        .getByRole("heading", { name: emailHeading }),
    ).toBeVisible();
    await page.locator("#copy-menu-button").click();
    await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
  });
}
