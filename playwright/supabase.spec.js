import { expect, test } from "@playwright/test";

const supabaseTemplates = [
  {
    id: "supabase-confirm-signup",
    cardTitle: "Confirm Signup",
    previewTitle: "Supabase Confirm Signup",
    emailHeading: "Confirm your email",
  },
  {
    id: "supabase-reset-password",
    cardTitle: "Reset Password",
    previewTitle: "Supabase Reset Password",
    emailHeading: "Reset your password",
  },
  {
    id: "supabase-magic-link",
    cardTitle: "Magic Link",
    previewTitle: "Supabase Magic Link",
    emailHeading: "Your sign-in link",
  },
  {
    id: "supabase-email-otp",
    cardTitle: "Email OTP",
    previewTitle: "Supabase Email OTP",
    emailHeading: "Your verification code",
  },
  {
    id: "supabase-invite-user",
    cardTitle: "Invite User",
    previewTitle: "Supabase Invite User",
    emailHeading: "You’ve been invited",
  },
];

test("the Supabase collection is the first homepage card and has its own filter", async ({
  page,
}) => {
  await page.goto("index.html");

  const integration = page.locator("[data-integration-card]");
  await expect(integration).toBeVisible();
  await expect(integration).toContainText("Supabase");
  await expect(
    integration.locator(".integration-card-preview img"),
  ).toHaveAttribute("src", /\/supabase-collection-card-preview\.png$/);
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
    page.getByRole("heading", {
      name: "Supabase Email Templates",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".collection-template-grid article.wrapper"),
  ).toHaveCount(supabaseTemplates.length);

  for (const template of supabaseTemplates) {
    const card = page.locator("article.wrapper", {
      has: page.getByRole("heading", { name: template.cardTitle }),
    });
    await expect(card.getByRole("link", { name: "Download" })).toHaveAttribute(
      "download",
      `${template.id}.html`,
    );
    await expect(
      card.getByRole("link", { name: "Live Preview External Link" }),
    ).toHaveAttribute("href", `./preview.html?template=${template.id}`);
  }
});

for (const template of supabaseTemplates) {
  test(`${template.id} opens with Supabase copy support`, async ({ page }) => {
    await page.goto(`preview.html?template=${template.id}`);

    await expect(
      page.getByText(template.previewTitle, { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#back-link")).toHaveAttribute(
      "aria-label",
      "Back to Supabase templates",
    );
    await expect(
      page
        .frameLocator("#template-frame")
        .getByRole("heading", { name: template.emailHeading }),
    ).toBeVisible();
    await page.locator("#copy-menu-button").click();
    await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
  });
}
