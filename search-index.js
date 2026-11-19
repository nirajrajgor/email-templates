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

export function buildSearchIndex(metadata) {
  const templates = Object.entries(metadata)
    .map(([file, entry]) => {
      const { image, lastmod } = entry;
      const { name, collections } = listingOf(file, entry);
      const labels = collections.map(({ label }) => label);

      return {
        name,
        image,
        lastmod,
        collection: labels[0],
        href: `./preview.html?template=${file.replace(/\.html$/, "")}`,
        text: [name, ...labels].join(" ").toLowerCase(),
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

// A name that starts with the query beats one that contains it, which beats a
// template matched only through its collection.
const rank = (template, query) => {
  const name = template.name.toLowerCase();
  if (name.startsWith(query)) return 0;
  return name.includes(query) ? 1 : 2;
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
      .filter(({ text }) => terms.every((term) => text.includes(term)))
      .sort((a, b) => rank(a, phrase) - rank(b, phrase)),
  };
}
