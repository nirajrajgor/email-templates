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

test("compact Supabase emails remain fully visible in square previews", async ({
  page,
}) => {
  await page.goto("supabase.html");

  const previews = page.locator(
    '.collection-template-grid article.wrapper > div[class*="aspect-"]',
  );
  await expect(previews).toHaveCount(5);

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
