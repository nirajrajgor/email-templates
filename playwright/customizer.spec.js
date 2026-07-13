import { expect, test } from "@playwright/test";

const customizableTemplates = [
  ["purchase-confirmation", 1],
  ["ecommerce-order", 1],
  ["shipping-confirmation", 1],
  ["promotional-offer", 1],
  ["shopping-deals", 1],
  ["gift-decor", 2],
  ["product-announcements", 1],
  ["ai-newsletter", 1],
  ["music-event-promotion", 2],
  ["abandoned-cart", 1],
  ["password-reset", 1],
  ["account-verification", 1],
  ["welcome-onboarding", 1],
  ["product-review", 1],
  ["reengagement", 1],
  ["account-billing-update", 1],
  ["product-promotion", 1],
];

for (const [templateId, expectedControlCount] of customizableTemplates) {
  test(`${templateId} keeps swatch selection exclusive`, async ({ page }) => {
    await page.goto(`preview.html?template=${templateId}`);

    const customizeButton = page.locator("#customize-button");
    await expect(customizeButton).toBeVisible();
    await customizeButton.click();
    await expect(page.locator("#customize-panel")).toBeVisible();
    const controls = page.locator(
      '#customize-panel [data-color-control]:not([hidden])',
    );
    await expect(controls).toHaveCount(expectedControlCount);

    for (let index = 0; index < expectedControlCount; index += 1) {
      const control = controls.nth(index);
      const swatches = control.locator("[data-swatch]");
      const originalSwatch = control.locator('[data-swatch="original"]');
      const initialHex = await control.locator('input[type="text"]').inputValue();

      await expect(originalSwatch).toHaveAttribute("aria-pressed", "true");
      await expect(
        control.locator('[data-swatch][aria-pressed="true"]'),
      ).toHaveCount(1);

      const swatchCount = await swatches.count();
      for (let swatchIndex = 0; swatchIndex < swatchCount; swatchIndex += 1) {
        const swatch = swatches.nth(swatchIndex);
        await swatch.click();
        await expect(swatch).toHaveAttribute("aria-pressed", "true");
        await expect(
          control.locator('[data-swatch][aria-pressed="true"]'),
        ).toHaveCount(1);
      }

      const hexInput = control.locator('input[type="text"]');
      await hexInput.fill("123456");
      await hexInput.dispatchEvent("change");
      await expect(hexInput).toHaveValue("#123456");
      await expect(
        control.locator('[data-swatch][aria-pressed="true"]'),
      ).toHaveCount(0);

      const colorInput = control.locator('input[type="color"]');
      await colorInput.evaluate((input) => {
        input.value = "#654321";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(hexInput).toHaveValue("#654321");
      await expect(
        control.locator('[data-swatch][aria-pressed="true"]'),
      ).toHaveCount(0);

      await originalSwatch.click();
      await expect(originalSwatch).toHaveAttribute("aria-pressed", "true");
      await expect(hexInput).toHaveValue(initialHex);
      await expect(
        control.locator('[data-swatch][aria-pressed="true"]'),
      ).toHaveCount(1);
    }

    const originalHtml = await page.evaluate(async (path) => {
      const response = await fetch(path);
      return response.text();
    }, `templates/${templateId}.html`);
    const brandControl = controls.first();
    await brandControl.locator("[data-swatch]").last().click();

    const frame = page.locator("#template-frame");
    await expect.poll(() => frame.getAttribute("srcdoc")).not.toBe(originalHtml);
    await expect(page.locator("#download-link")).toHaveAttribute(
      "href",
      /^blob:/,
    );

    await brandControl.locator('[data-swatch="original"]').click();
    await expect.poll(() => frame.getAttribute("srcdoc")).toBe(originalHtml);
  });
}

test("product-confirmation correctly has no customizer", async ({ page }) => {
  await page.goto("preview.html?template=product-confirmation");
  await expect(page.locator("#customize-button")).toBeHidden();
});
