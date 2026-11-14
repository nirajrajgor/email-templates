import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const templateMetadata = JSON.parse(
  readFileSync(
    new URL("../scripts/template-metadata.json", import.meta.url),
    "utf8",
  ),
);

// Supabase and Better Auth templates live on their own collection pages, so
// the main grid shows every other template in the metadata.
const catalogFiles = Object.keys(templateMetadata).filter(
  (file) => !/^(supabase|better-auth)-/.test(file),
);

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

// Templates load images from picsum.photos and other hosts, and the app pages
// load Google Fonts. A slow or unreachable host stalls the load event that
// page.goto waits for, so every external request is answered locally.
test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname),
    (route) => {
      const request = route.request();
      const type = request.resourceType();

      if (type === "image") {
        // Keep the size picsum encodes in its path, such as /seed/name/240/240.
        const [, width = "1", height = "1"] =
          new URL(request.url()).pathname.match(/\/(\d+)\/(\d+)\/?$/) ?? [];
        return route.fulfill({
          contentType: "image/svg+xml",
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ccc"/></svg>`,
        });
      }

      if (type === "stylesheet") {
        return route.fulfill({ contentType: "text/css", body: "" });
      }

      return route.abort();
    },
  );
});

const selectOption = async (page, menuButton, option) => {
  await page.locator(menuButton).click();
  await page.locator(option).click();
};

const categoryPages = [
  {
    link: /^View all \d+ ecommerce templates/,
    heading: "Ecommerce Email Templates",
    file: "ecommerce-email-templates.html",
  },
  {
    link: /^View all \d+ marketing templates/,
    heading: "Marketing Email Templates",
    file: "marketing-email-templates.html",
  },
  {
    link: /^View all \d+ newsletter templates/,
    heading: "Newsletter Email Templates",
    file: "newsletter-email-templates.html",
  },
  {
    link: /^View all \d+ account templates/,
    heading: "Account Email Templates",
    file: "account-email-templates.html",
  },
  {
    link: /^View all \d+ auth templates/,
    heading: "Authentication Email Templates",
    file: "auth-email-templates.html",
  },
];

test("homepage sections lead to category pages that list their templates", async ({
  page,
}) => {
  const listed = new Set();

  for (const { link, heading, file } of categoryPages) {
    await page.goto("index.html");
    await page.getByRole("link", { name: link }).click();

    await expect(page).toHaveURL(new RegExp(`${file}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();

    const files = await page
      .locator("article.wrapper a[download]")
      .evaluateAll((links) => links.map((a) => a.getAttribute("download")));
    files.forEach((name) => listed.add(name));

    // The breadcrumb is the way back to the homepage.
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Templates" })
      .click();
    await expect(page).toHaveURL(/index\.html$/);
  }

  // Between them the category pages reach every template in the metadata.
  expect([...listed].sort()).toEqual([...catalogFiles].sort());

  await expect(
    page.locator("#collection-grid > article[data-integration-card] h3"),
  ).toHaveText(["Supabase", "Better Auth"]);
});

test("a category page opens a working template preview", async ({ page }) => {
  await page.goto("ecommerce-email-templates.html");
  await page.getByRole("link", { name: "Preview Order Delivered" }).click();

  await expect(page).toHaveURL(/preview\.html\?template=order-delivered$/);
  await expect(
    page.frameLocator("#template-frame").getByText("Delivered.").first(),
  ).toBeVisible();
});

test("old homepage filter links open the matching category page", async ({
  page,
}) => {
  await page.goto("index.html?category=auth&q=reset");
  await expect(page).toHaveURL(/auth-email-templates\.html$/);

  await page.goto("index.html?category=supabase");
  await expect(page).toHaveURL(/supabase\.html$/);
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

  const passwordChangedCard = page.locator("article.wrapper", {
    has: page.getByRole("heading", { name: "Password Changed" }),
  });
  await expect(
    passwordChangedCard.getByRole("link", {
      name: "Download Password Changed",
    }),
  ).toHaveAttribute("download", "supabase-password-changed.html");

  await reauthenticationCard
    .getByRole("link", { name: "Preview Reauthentication" })
    .click();

  await expect(
    page
      .frameLocator("#template-frame")
      .getByRole("heading", { name: "Your verification code" }),
  ).toBeVisible();
  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Supabase HTML")).toBeVisible();
});

test("the Better Auth collection opens a working template preview", async ({
  page,
}) => {
  await page.goto("index.html");
  await page
    .getByRole("link", {
      name: "View the Better Auth Email Templates collection",
    })
    .click();

  await page.getByRole("link", { name: "Preview Delete Account" }).click();

  await expect(
    page
      .frameLocator("#template-frame")
      .getByRole("heading", { name: "Confirm account deletion" }),
  ).toBeVisible();
  await page.locator("#copy-menu-button").click();
  await expect(page.getByText("Copy Better Auth HTML")).toBeVisible();
});
