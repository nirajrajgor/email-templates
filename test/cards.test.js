import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "cheerio";

import { renderCards } from "../cards.js";
import { COLLECTIONS } from "../collections.js";

const readText = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const metadata = JSON.parse(await readText("scripts/template-metadata.json"));

// A page as the build ships it, with its cards written in.
const readPage = async (file) =>
  load(renderCards(await readText(file), metadata));

const MAX_FEATURED_PER_SECTION = 4;
const CATEGORIES = COLLECTIONS.filter(({ key }) =>
  Object.values(metadata).some(({ categories }) => categories?.includes(key)),
);

const filesIn = (key) =>
  Object.keys(metadata).filter((file) =>
    metadata[file].categories
      ? metadata[file].categories.includes(key)
      : file.startsWith(`${key}-`),
  );

const downloads = ($, cards) =>
  $(cards)
    .find("a[download]")
    .map((_, link) => $(link).attr("download"))
    .get();

const lastmods = (files) => files.map((file) => metadata[file].lastmod);

for (const { key, page } of COLLECTIONS) {
  test(`${page} lists every ${key} template once`, async () => {
    const $ = await readPage(page);
    const shown = downloads($, $(".template-grid article.wrapper"));

    // A page whose marker is missing or names another collection fails here.
    assert.deepEqual([...shown].sort(), filesIn(key).sort());
  });
}

for (const { key, page } of CATEGORIES) {
  test(`${page} lists its newest template first`, async () => {
    const $ = await readPage(page);
    const dates = lastmods(downloads($, $("article.wrapper")));

    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  test(`the homepage ${key} section shows its newest templates`, async () => {
    const $ = await readPage("index.html");
    const section = $(`section[aria-labelledby="${key}-heading"]`);
    const shown = downloads($, section.find("article.wrapper"));
    const dates = lastmods(shown);

    // A template sits in the section of the first category it lists.
    const candidates = Object.keys(metadata).filter(
      (file) => metadata[file].categories?.[0] === key,
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
      new RegExp(`^View all ${filesIn(key).length} ${key} email templates`),
    );
  });
}

test("every template is listed on a collection page", () => {
  const unlisted = Object.keys(metadata).filter((file) =>
    COLLECTIONS.every(({ key }) => !filesIn(key).includes(file)),
  );

  assert.deepEqual(unlisted, []);
});

test("every template has a description for its card", () => {
  for (const [file, { description }] of Object.entries(metadata)) {
    assert.ok(description?.trim(), file);
  }
});

// The tests below render a made-up template, so they do not change when the
// catalog does.
const sample = {
  "terms-update.html": {
    lastmod: "2026-01-02",
    image: "terms-update-preview.webp",
    title: "Terms & Conditions HTML Email Template",
    description: 'Tell users what "changed" in <2 minutes & why.',
    categories: ["marketing", "ecommerce"],
    new: true,
  },
  "plain.html": {
    lastmod: "2026-01-01",
    image: "plain-preview.webp",
    title: "Plain Email Template",
    description: "A plain one.",
    categories: ["marketing"],
  },
  "supabase-email-otp.html": {
    lastmod: "2026-01-03",
    image: "supabase-email-otp-preview.png",
    title: "Supabase Email OTP HTML Email Template",
    description: "Send a one-time code.",
  },
};

const cardsOf = (marker) => {
  const $ = load(renderCards(`<main>\n  <!-- ${marker} -->\n</main>`, sample));
  return $("article.wrapper")
    .map((_, card) => ({
      title: $(card).find("h2, h3").text().trim(),
      heading: $(card).find("h2, h3").prop("tagName"),
      copy: $(card).find(".catalog-card-copy").text().trim(),
      alt: $(card).find("img").attr("alt"),
      src: $(card).find("img").attr("src"),
      tags: $(card).find(".catalog-card-tags").text(),
      isNew: $(card).find(".catalog-card-new").length === 1,
      links: [...new Set($(card).find("a").map((_, a) => $(a).attr("href")).get())],
      download: $(card).find("a[download]").text().replace(/\s+/g, " ").trim(),
    }))
    .get();
};

test("a category card names the template's other categories", () => {
  assert.deepEqual(cardsOf("cards marketing"), [
    {
      title: "Terms & Conditions",
      heading: "H2",
      copy: 'Tell users what "changed" in <2 minutes & why.',
      alt: "Terms & Conditions email template preview",
      src: "./terms-update-preview.webp",
      tags: "Ecommerce",
      isNew: true,
      links: [
        "./preview.html?template=terms-update",
        "./templates/terms-update.html",
      ],
      download: "Download Terms & Conditions",
    },
    {
      title: "Plain",
      heading: "H2",
      copy: "A plain one.",
      alt: "Plain email template preview",
      src: "./plain-preview.webp",
      tags: "",
      isNew: false,
      links: ["./preview.html?template=plain", "./templates/plain.html"],
      download: "Download Plain",
    },
  ]);
});

test("a homepage card names every category under an Emailer title", () => {
  const [card, ...rest] = cardsOf("featured marketing");

  assert.equal(rest.length, 1);
  assert.equal(card.title, "Terms & Conditions Emailer");
  assert.equal(card.copy, 'Tell users what "changed" in <2 minutes & why.');
  assert.equal(card.heading, "H3");
  assert.equal(card.alt, "Terms & Conditions Thumbnail");
  assert.equal(card.tags, "Marketing · Ecommerce");
  assert.equal(card.download, "Download Terms & Conditions Emailer");

  // A template is featured only under the first category it lists.
  assert.deepEqual(cardsOf("featured ecommerce"), []);
});

test("a homepage card uses the homepage wording a template gives it", () => {
  const worded = {
    "plain.html": {
      ...sample["plain.html"],
      homeTitle: "Plain HTML Email Template",
      homeDescription: "A plain html email template.",
    },
  };
  const $ = load(renderCards("<!-- featured marketing -->", worded));

  assert.equal($("h3").text().trim(), "Plain HTML Email Template");
  assert.equal($(".catalog-card-copy").text().trim(), "A plain html email template.");
  assert.equal($("img").attr("alt"), "Plain Thumbnail");
});

test("an integration card drops the integration from its title and has no tags", () => {
  const [card] = cardsOf("cards supabase");

  assert.equal(card.title, "Email OTP");
  assert.equal(card.alt, "Supabase Email OTP preview");
  assert.equal(card.tags, "");
});

test("a count marker becomes the number of templates in the collection", () => {
  assert.equal(
    renderCards("View all <!-- count marketing --><span>", sample),
    "View all 2<span>",
  );
});

test("a marker that names no collection fails the build", () => {
  assert.throws(() => renderCards("<!-- cards marketting -->", sample), /marketting/);
});
