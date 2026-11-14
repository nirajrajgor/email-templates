import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "cheerio";

const readText = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const readPage = async (file) => load(await readText(file));

const metadata = JSON.parse(await readText("scripts/template-metadata.json"));

// Each category has its own page and a section on the homepage.
const CATEGORY_PAGES = {
  ecommerce: "ecommerce-email-templates.html",
  marketing: "marketing-email-templates.html",
  newsletter: "newsletter-email-templates.html",
  account: "account-email-templates.html",
  auth: "auth-email-templates.html",
};
const MAX_FEATURED_PER_SECTION = 6;

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

  test(`the homepage ${category} section shows its newest templates`, async () => {
    const $ = await readPage("index.html");
    const section = $(`section[aria-labelledby="${category}-heading"]`);
    const shown = downloads($, section.find("article.wrapper"));
    const dates = shown.map((file) => metadata[file].lastmod);

    // A template sits in the section of the first category it lists.
    const candidates = Object.keys(metadata).filter(
      (file) => metadata[file].categories?.[0] === category,
    );
    const hidden = candidates.filter((file) => !shown.includes(file));

    assert.equal(
      shown.length,
      Math.min(candidates.length, MAX_FEATURED_PER_SECTION),
    );
    assert.deepEqual(shown.filter((file) => !candidates.includes(file)), []);
    assert.deepEqual(dates, [...dates].sort().reverse(), "newest first");
    for (const file of hidden) {
      assert.ok(
        metadata[file].lastmod <= dates.at(-1),
        `${file} is newer than a template shown in its place`,
      );
    }

    const more = section.find("a.catalog-section-more");
    assert.equal(more.attr("href"), `./${page}`);
    assert.match(
      more.text().replace(/\s+/g, " "),
      new RegExp(`^View all ${filesIn(category).length} ${category} templates`),
    );
  });
}

test("homepage cards link to their template and none repeats", async () => {
  const $ = await readPage("index.html");
  const cards = $(".template-grid article.wrapper");
  const shown = downloads($, cards);

  assert.equal(new Set(shown).size, shown.length);
  assertCardsLinkToTheirTemplate($, cards);
});

test("every catalog template belongs to a category page", () => {
  const uncategorized = Object.keys(metadata).filter(
    (file) =>
      !/^(supabase|better-auth)-/.test(file) &&
      !metadata[file].categories?.some((category) => category in CATEGORY_PAGES),
  );

  assert.deepEqual(uncategorized, []);
});
