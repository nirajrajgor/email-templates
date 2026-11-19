import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { COLLECTIONS } from "../collections.js";
import { buildSearchIndex, search } from "../search-index.js";

const readText = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const metadata = JSON.parse(await readText("scripts/template-metadata.json"));
const index = buildSearchIndex(metadata);
const hrefs = (templates) => templates.map(({ href }) => href);

test("search lists every template under a short name", () => {
  assert.equal(index.templates.length, Object.keys(metadata).length);

  for (const { name } of index.templates) {
    // A title that breaks the naming pattern would be listed in full.
    assert.doesNotMatch(name, /Template$/, name);
    assert.doesNotMatch(name, /^(Supabase|Better Auth) /, name);
  }
});

test("each collection counts its templates", () => {
  for (const [position, { key, label, page }] of COLLECTIONS.entries()) {
    const files = Object.keys(metadata).filter((file) =>
      metadata[file].categories
        ? metadata[file].categories.includes(key)
        : file.startsWith(`${key}-`),
    );

    assert.deepEqual(index.collections[position], {
      label,
      href: `./${page}`,
      count: files.length,
    });
  }
});

test("a template is found by its own name", () => {
  for (const { name, href } of index.templates) {
    assert.ok(hrefs(search(index, name).templates).includes(href), name);
  }
});

test("a name that starts with the query is listed first", () => {
  const names = search(index, "order").templates.map(({ name }) => name);

  assert.equal(names.at(-1), "Ecommerce Order");
  assert.ok(names.slice(0, -1).every((name) => name.startsWith("Order")));
});

test("a collection name finds its page and its templates", () => {
  const supabase = search(index, "supabase");
  assert.deepEqual(
    supabase.collections.map(({ label }) => label),
    ["Supabase"],
  );
  assert.equal(supabase.templates.length, supabase.collections[0].count);

  // Two integrations have a Magic Link, so the collection narrows it to one.
  assert.deepEqual(hrefs(search(index, "Supabase magic").templates), [
    "./preview.html?template=supabase-magic-link",
  ]);
});

test("an empty or unmatched query finds nothing", () => {
  for (const query of ["", "   ", "zzzz"]) {
    assert.deepEqual(search(index, query), { collections: [], templates: [] });
  }
});
