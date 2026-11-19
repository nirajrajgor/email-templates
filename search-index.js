// Turns the template metadata into what the header search lists and matches.
// It has no DOM access, so the tests can run it in Node.
import { COLLECTIONS } from "./collections.js";

const collectionsOf = (file, categories) =>
  COLLECTIONS.filter(({ key }) =>
    categories ? categories.includes(key) : file.startsWith(`${key}-`),
  );

// "Supabase Magic Link HTML Email Template" is listed as "Magic Link", because
// each result shows its collection under the name. Only an integration's name
// is a prefix to drop: "Ecommerce Order" is the template's own name.
const shortName = (title, integration) => {
  const name = title.replace(/ (HTML )?(Email )?Template$/, "");
  const prefix = `${integration?.label} `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
};

// The short name and the collections of a template, which the search and the
// cards both list.
export const listingOf = (file, { title, categories }) => {
  const collections = collectionsOf(file, categories);
  return {
    collections,
    name: shortName(title, categories ? null : collections[0]),
  };
};

// Punctuation separates words, so "label" finds "shop-by-label" and "20" finds
// "$20".
const wordsOf = (text) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function buildSearchIndex(metadata) {
  const templates = Object.entries(metadata)
    .map(([file, entry]) => {
      const { image, lastmod, description } = entry;
      const { name, collections } = listingOf(file, entry);
      const labels = collections.map(({ label }) => label);

      return {
        name,
        image,
        lastmod,
        collection: labels[0],
        href: `./preview.html?template=${file.replace(/\.html$/, "")}`,
        text: [name, ...labels].join(" ").toLowerCase(),
        // Matched from the start of a word, so "art" does not find every
        // description that says "cart" or "start".
        description: ` ${wordsOf(description)}`,
        keys: collections.map(({ key }) => key),
      };
    })
    // Newest first, so a tie between matches favours recent templates.
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod));

  const collections = COLLECTIONS.map(({ key, label, page }) => ({
    label,
    href: `./${page}`,
    count: templates.filter(({ keys }) => keys.includes(key)).length,
  }));

  return { templates, collections };
}

const termsOf = (query) => query.toLowerCase().split(/\s+/).filter(Boolean);

const matches = ({ text, description }, term) => {
  const words = wordsOf(term);
  return text.includes(term) || (words && description.includes(` ${words}`));
};

// A name that starts with the query beats one that contains it. Next comes a
// template matched through its collection, and last one that only mentions
// the query in its description.
const rank = (template, terms, phrase) => {
  const name = template.name.toLowerCase();
  if (name.startsWith(phrase)) return 0;
  if (name.includes(phrase)) return 1;
  return terms.every((term) => template.text.includes(term)) ? 2 : 3;
};

export function search(index, query) {
  const terms = termsOf(query);
  if (terms.length === 0) return { collections: [], templates: [] };

  const phrase = terms.join(" ");
  return {
    collections: index.collections.filter(({ label }) =>
      label.toLowerCase().includes(phrase),
    ),
    templates: index.templates
      .filter((template) => terms.every((term) => matches(template, term)))
      .sort((a, b) => rank(a, terms, phrase) - rank(b, terms, phrase)),
  };
}
