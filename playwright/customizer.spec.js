import { expect, test } from "@playwright/test";

import { rethemeHtml } from "../customizer.js";

const customizableTemplates = [
  "purchase-confirmation", "ecommerce-order", "shipping-confirmation",
  "promotional-offer", "shopping-deals", "gift-decor",
  "product-announcements", "ai-newsletter", "music-event-promotion",
  "abandoned-cart", "password-reset", "account-verification",
  "welcome-onboarding", "product-review", "reengagement",
  "account-billing-update", "product-promotion",
  "supabase-confirm-signup", "supabase-reset-password",
];
const dualColorTemplates = new Set(["gift-decor", "music-event-promotion"]);
const templateCases = [
  ...customizableTemplates.map((id) => [id, dualColorTemplates.has(id) ? 2 : 1]),
  ["product-confirmation", 0],
];

const openCustomizer = async (page, templateId, expectedControls) => {
  await page.goto(`preview.html?template=${templateId}`);
  const button = page.locator("#customize-button");
  if (expectedControls === 0) {
    await expect(button).toBeHidden();
    return null;
  }
  await expect(button).toBeVisible();
  await button.click();
  const controls = page.locator(
    '#customize-panel [data-color-control]:not([hidden])',
  );
  await expect(controls).toHaveCount(expectedControls);
  return controls;
};

for (const [templateId, expectedControls] of templateCases) {
  test(`${templateId} exposes the expected color controls`, async ({ page }) => {
    const controls = await openCustomizer(page, templateId, expectedControls);
    if (!controls) return;
    await expect(
      controls.locator('[data-swatch="original"][aria-pressed="true"]'),
    ).toHaveCount(expectedControls);
    await expect(
      controls.locator('[data-swatch][aria-pressed="true"]'),
    ).toHaveCount(expectedControls);
  });
}

test("a preset matching the original remains exclusive", async ({ page }) => {
  const control = (await openCustomizer(page, "product-announcements", 1)).first();
  const preset = control.locator('[data-swatch="#4f46e5"]');
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(control.locator('[aria-pressed="true"]')).toHaveCount(1);
});

test("dual colors update preview and download, then reset", async ({ page }) => {
  const controls = await openCustomizer(page, "gift-decor", 2);
  const brand = controls.first();
  const accent = controls.nth(1);
  const frame = page.locator("#template-frame");
  const originalHtml = await page.evaluate(async () =>
    fetch("templates/gift-decor.html").then((response) => response.text()),
  );

  const brandHex = brand.locator('input[type="text"]');
  await brandHex.fill("#123456");
  await brandHex.dispatchEvent("change");
  const violet = accent.locator('[data-swatch="#7c3aed"]');
  await violet.click();

  const customizedHtml = rethemeHtml(originalHtml, [
    { from: "#ffd700", to: "#123456" },
    { from: "#663399", to: "#7c3aed" },
  ]);
  await expect.poll(() => frame.getAttribute("srcdoc")).toBe(customizedHtml);
  await expect(brand.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(violet).toHaveAttribute("aria-pressed", "true");

  const href = await page.locator("#download-link").getAttribute("href");
  const downloadHtml = await page.evaluate(async (url) =>
    fetch(url).then((response) => response.text()), href,
  );
  expect(downloadHtml).toBe(customizedHtml);

  await brand.locator('[data-swatch="original"]').click();
  await accent.locator('[data-swatch="original"]').click();
  await expect.poll(() => frame.getAttribute("srcdoc")).toBe(originalHtml);
});
