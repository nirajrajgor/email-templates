import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "cheerio";

const readText = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const readPage = async (file) => load(await readText(file));

const metadata = JSON.parse(await readText("scripts/template-metadata.json"));

// Each category has its own page.
const CATEGORY_PAGES = {
  ecommerce: "ecommerce-email-templates.html",
  marketing: "marketing-email-templates.html",
  newsletter: "newsletter-email-templates.html",
  account: "account-email-templates.html",
  auth: "auth-email-templates.html",
};

const filesIn = (category) =>
  Object.keys(metadata).filter((file) =>
    metadata[file].categories?.includes(category),
  );

const downloads = ($, cards) =>
  $(cards)
    .find("a[download]")
    .map((_, link) => $(link).attr("download"))
    .get();

const assertCardsLinkToTheirTemplate = ($, cards) => {
  $(cards).each((_, card) => {
    const file = $(card).find("a[download]").attr("download");
    const slug = file.replace(/\.html$/, "");
    const hrefs = new Set(
      $(card)
        .find("a")
        .map((_, link) => $(link).attr("href"))
        .get(),
    );

    assert.deepEqual(
      [...hrefs].sort(),
      [`./preview.html?template=${slug}`, `./templates/${file}`],
      file,
    );
  });
};

for (const [category, page] of Object.entries(CATEGORY_PAGES)) {
  test(`${page} lists every ${category} template once`, async () => {
    const $ = await readPage(page);
    const cards = $("article.wrapper");

    // A template given this category in the metadata must be added here too.
    assert.deepEqual(downloads($, cards).sort(), filesIn(category).sort());
    assertCardsLinkToTheirTemplate($, cards);
  });
}

test("every catalog template belongs to a category page", () => {
  const uncategorized = Object.keys(metadata).filter(
    (file) =>
      !/^(supabase|better-auth)-/.test(file) &&
      !metadata[file].categories?.some((category) => category in CATEGORY_PAGES),
  );

  assert.deepEqual(uncategorized, []);
});
