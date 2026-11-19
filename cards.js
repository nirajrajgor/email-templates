// Renders the template cards of every page from the template metadata. The
// Vite config runs it on each page's source, so it has no DOM access and the
// tests can run it in Node.
import { COLLECTIONS } from "./collections.js";
import { listingOf } from "./search-index.js";

const FEATURED_PER_SECTION = 4;

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const labelOf = (key) => COLLECTIONS.find((item) => item.key === key).label;

const newestFirst = (a, b) => b.lastmod.localeCompare(a.lastmod);

// A category page lists its newest template first, and templates of one date
// stay in metadata order. An integration page keeps metadata order throughout,
// which follows the steps of signing up and managing an account.
export function templatesIn(metadata, key) {
  const templates = Object.entries(metadata)
    .map(([file, entry]) => ({ file, ...entry, ...listingOf(file, entry) }))
    .filter(({ collections }) => collections.some((item) => item.key === key));

  return templates.some(({ categories }) => !categories)
    ? templates
    : templates.sort(newestFirst);
}

// A homepage section shows the newest templates that list its category first,
// so no template appears in two sections.
export const featuredIn = (metadata, key) =>
  templatesIn(metadata, key)
    .filter(({ categories }) => categories[0] === key)
    .slice(0, FEATURED_PER_SECTION);

const renderCard = ({ template, heading, title, description, alt, tags }) => {
  const { image } = template;
  // A name is escaped wherever it lands, so one with "&" or "#" still links.
  const file = escapeHtml(template.file);
  const slug = encodeURIComponent(template.file.replace(/\.html$/, ""));
  const preview = `./preview.html?template=${slug}`;
  const badge = template.new
    ? `\n    <span class="catalog-card-new">New</span>`
    : "";
  const tagLine = tags.length
    ? `\n    <p class="catalog-card-tags">${tags.map(labelOf).join(" &middot; ")}</p>`
    : "";

  return `<article class="wrapper catalog-card">
  <a
    class="catalog-card-preview"
    href="${preview}"
    tabindex="-1"
    aria-hidden="true"
  >
    <div
      class="catalog-card-frame relative w-full aspect-square overflow-hidden rounded-lg bg-[#f4f4f4] dark:bg-gray-800 dark:border dark:border-white/[0.1]"
    >
      <img
        src="./${escapeHtml(image)}"
        alt="${escapeHtml(alt)}"
        loading="lazy"
        class="blur-0 rounded-md w-full h-full object-cover object-top"
        style="color: transparent"
      />
    </div>
  </a>
  <div class="catalog-card-heading">
    <${heading} class="catalog-card-title">
      <a href="${preview}">${escapeHtml(title)}</a>
    </${heading}>${badge}
  </div>
  <p class="catalog-card-copy">
    ${escapeHtml(description)}
  </p>
  <div class="catalog-card-footer">${tagLine}
    <a
      class="catalog-card-download"
      href="./templates/${encodeURIComponent(template.file)}"
      download="${file}"
      ><svg aria-hidden="true" viewBox="0 0 24 24">
        <use href="./icons.svg#icon-download"></use></svg
      ><span class="catalog-card-download-label">Download</span><span class="sr-only"> ${escapeHtml(title)}</span></a
    >
  </div>
</article>`;
};

// A category card names the other categories of its template. An integration
// card has none to name, and its alt text says which integration it is for.
const collectionCard = (key) => (template) => {
  const { name, categories } = template;
  const email = /email/i.test(name) ? "" : " email";

  return renderCard({
    template,
    heading: "h2",
    title: name,
    description: template.description,
    alt: categories
      ? `${name} email template preview`
      : `${labelOf(key)} ${name}${email} preview`,
    tags: (categories ?? []).filter((category) => category !== key),
  });
};

// The homepage mixes categories, so its cards name every one. It is the page
// that ranks for "HTML email template", so a template can give it a title and
// a description that carry those words.
const homepageCard = (template) =>
  renderCard({
    template,
    heading: "h3",
    title: template.homeTitle ?? `${template.name} Emailer`,
    description: template.homeDescription ?? template.description,
    alt: `${template.name} Thumbnail`,
    tags: template.categories,
  });

const RENDERERS = {
  cards: (metadata, key) =>
    templatesIn(metadata, key).map(collectionCard(key)).join("\n\n"),
  featured: (metadata, key) =>
    featuredIn(metadata, key).map(homepageCard).join("\n\n"),
  count: (metadata, key) => String(templatesIn(metadata, key).length),
};

const LEFTOVER_MARKER = /<!--\s*(?:cards|featured|count)\b[^>]*-->/;

// Replaces each `<!-- cards key -->` or `<!-- featured key -->` line with cards
// at the line's indentation, and each `<!-- count key -->` with the number of
// templates in that collection.
export function renderCards(html, metadata) {
  const render = (marker, key) => {
    // A misspelled key would otherwise build a page with an empty grid.
    if (!COLLECTIONS.some((item) => item.key === key)) {
      throw new Error(`<!-- ${marker} ${key} --> names no collection`);
    }
    return RENDERERS[marker](metadata, key);
  };

  const rendered = html
    .replace(
      /^([ \t]*)<!-- (cards|featured) ([\w-]+) -->[ \t\r]*$/gm,
      (_, indent, marker, key) =>
        render(marker, key).replace(/^(?=.)/gm, indent),
    )
    .replace(/<!-- (count) ([\w-]+) -->/g, (_, marker, key) =>
      render(marker, key),
    );

  // A marker that shares its line or is spaced differently is not replaced,
  // and would build a page with an empty grid.
  const [leftover] = rendered.match(LEFTOVER_MARKER) ?? [];
  if (leftover) throw new Error(`${leftover} was not replaced`);

  return rendered;
}
