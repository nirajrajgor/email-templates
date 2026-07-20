import { expect, test } from "@playwright/test";

test("a long template scrolls inside its preview without growing the card", async ({
  page,
}) => {
  await page.goto("index.html");

  const image = page.getByAltText("Product Promotion Thumbnail");
  await expect(image).toHaveCount(1);
  const preview = image.locator("..");
  const before = await preview.boundingBox();

  await preview.hover();
  await expect
    .poll(() => image.evaluate((node) => node.style.transform))
    .toContain("translateY(-");

  const during = await preview.boundingBox();
  expect(during?.height).toBeCloseTo(before?.height ?? 0, 2);
});
