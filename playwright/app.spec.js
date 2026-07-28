import { expect, test } from "@playwright/test";

const selectOption = async (page, menuButton, option) => {
  await page.locator(menuButton).click();
  await page.locator(option).click();
};

test("catalog filtering, URL state, and template links work", async ({ page }) => {
  await page.goto("index.html");

  await page.locator('.filter-pill[data-filter-value="auth"]').click();
  await expect(
    page.locator("#template-grid article.wrapper:visible"),
  ).toHaveCount(2);

  const search = page.getByRole("searchbox", { name: "Search templates" });
  await search.fill("reset");
  await expect(
    page.locator("#template-grid article.wrapper:visible"),
  ).toHaveCount(1);
  await expect
    .poll(() => new URL(page.url()).search)
    .toBe("?category=auth&q=reset");

  const links = await page.locator("#template-grid article.wrapper").evaluateAll(
    (cards) =>
      cards.map((card) => ({
        preview: card
          .querySelector('a[href*="preview.html?template="]')
          ?.getAttribute("href"),
        download: card.querySelector("a[download]")?.getAttribute("href"),
        filename: card.querySelector("a[download]")?.getAttribute("download"),
      })),
  );

  expect(links).toHaveLength(18);
  links.forEach(({ preview, download, filename }) => {
    expect(preview).toMatch(/^\.\/preview\.html\?template=/);
    expect(download).toBe(`./templates/${filename}`);
  });
});

test("customization updates the preview and downloaded HTML", async ({ page }) => {
  await page.goto("preview.html?template=gift-decor");

  const controls = page.locator(
    "#customize-panel [data-color-control]:not([hidden])",
  );
  await expect(controls).toHaveCount(2);
  await controls.first().locator('input[type="text"]').fill("#123456");
  await controls.nth(1).locator('[data-swatch="#7c3aed"]').click();

  const frame = page.locator("#template-frame");
  await expect.poll(() => frame.getAttribute("srcdoc")).toContain("#123456");
  await expect.poll(() => frame.getAttribute("srcdoc")).toContain("#7c3aed");

  const href = await page.locator("#download-link").getAttribute("href");
  expect(href).toMatch(/^blob:/);
  const downloaded = await page.evaluate(
    async (url) => fetch(url).then((response) => response.text()),
    href,
  );
  expect(downloaded).toContain("#123456");
  expect(downloaded).toContain("#7c3aed");

  await controls.first().locator('[data-swatch="original"]').click();
  await expect.poll(() => frame.getAttribute("srcdoc")).not.toContain("#123456");
});

test("mobile, stripped-CSS, and dark preview modes remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("preview.html?template=product-promotion");
  await expect(page.locator("#template-frame")).toBeVisible();
  await expect(page.locator("#dark-menu-label")).toHaveText("Original");

  await selectOption(
    page,
    "#viewport-menu-button",
    '[data-viewport="mobile"]',
  );
  await expect(page.locator("#viewport-menu-label")).toHaveText(
    "Mobile · 375px",
  );
  await expect
    .poll(() =>
      page.locator("#template-frame").evaluate((frame) =>
        parseInt(frame.style.width, 10),
      ),
    )
    .toBe(375);
  await expect(page.locator("#overflow-warning")).toBeHidden();

  await selectOption(
    page,
    "#viewport-menu-button",
    '[data-viewport="mobile-nocss"]',
  );
  await expect(page.locator("#viewport-menu-label")).toHaveText(
    "Mobile, styles stripped",
  );
  // Templates are desktop-default, so stripping styles shows the natural
  // desktop layout scaled down to phone width.
  await expect
    .poll(() =>
      page.locator("#template-frame").evaluate(
        (frame) =>
          parseInt(frame.style.width, 10) >= 375 &&
          frame.contentDocument?.querySelectorAll("style").length === 0,
      ),
    )
    .toBe(true);

  const geometry = await page.locator("#template-frame").evaluate((frame) => {
    const bounds = frame.getBoundingClientRect();
    return {
      layoutWidth: parseInt(frame.style.width, 10),
      left: bounds.left,
      right: bounds.right,
      viewport: window.innerWidth,
    };
  });
  expect(geometry.layoutWidth).toBeGreaterThanOrEqual(375);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);

  await selectOption(page, "#dark-menu-button", '[data-dark-mode="full"]');
  await expect(page.locator("#dark-menu-label")).toHaveText("Full inversion");
  await expect
    .poll(() =>
      page.locator("#template-frame").evaluate(
        (frame) =>
          frame.contentDocument?.querySelectorAll("[data-dark-sim-original]")
            .length ?? 0,
      ),
    )
    .toBeGreaterThan(0);

  await selectOption(page, "#dark-menu-button", '[data-dark-mode="none"]');
  await expect(page.locator("#dark-menu-label")).toHaveText("Original");
  await expect
    .poll(() =>
      page.locator("#template-frame").evaluate(
        (frame) =>
          frame.contentDocument?.querySelectorAll("[data-dark-sim-original]")
            .length ?? 0,
      ),
    )
    .toBe(0);

  const originalDownload = await page.evaluate(async () => {
    const response = await fetch(document.getElementById("download-link").href);
    return response.text();
  });
  expect(originalDownload).toContain("<style");
  expect(originalDownload).not.toContain("data-dark-sim-original");
});

test("product promotion changes layout without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("preview.html?template=product-promotion");
  await expect
    .poll(() =>
      page
        .locator("#template-frame")
        .evaluate((frame) => parseInt(frame.style.width, 10)),
    )
    .toBe(624);

  for (const [width, display] of [
    [623, "block"],
    [624, "table-cell"],
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("templates/product-promotion.html");

    const layout = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headerDisplay: getComputedStyle(
        document.querySelector(".header-cell"),
      ).display,
    }));

    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.headerDisplay).toBe(display);
  }
});

test("the Supabase collection opens a working template preview", async ({
  page,
}) => {
  await page.goto("index.html");
  await page
    .getByRole("link", {
      name: "View the Supabase Email Templates collection",
    })
    .click();

  await expect(page).toHaveURL(/supabase\.html$/);
  await expect(
    page.locator(".collection-template-grid article.wrapper"),
  ).toHaveCount(7);

  const card = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Confirm Signup" }),
  });
  await expect(
    card.getByRole("link", { name: "Download Confirm Signup" }),
  ).toHaveAttribute("download", "supabase-confirm-signup.html");

  const changeEmailCard = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Change Email Address" }),
  });
  await expect(
    changeEmailCard.getByRole("link", {
      name: "Download Change Email Address",
    }),
  ).toHaveAttribute("download", "supabase-change-email.html");

  const reauthenticationCard = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Reauthentication" }),
  });
  await expect(
    reauthenticationCard.getByRole("link", {
      name: "Download Reauthentication",
    }),
  ).toHaveAttribute("download", "supabase-reauthentication.html");

  await reauthenticationCard
    .getByRole("link", { name: "Preview Reauthentication" })
    .click();

  await expect(
    page
      .frameLocator("#template-frame")
      .getByRole("heading", { name: "Your verification code" }),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("#template-frame")
      .getByText(
        "Use the code below to verify your identity. It expires shortly.",
      ),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("#template-frame")
      .getByText("Didn’t request this code?"),
  ).toBeVisible();
  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});
