import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, normalizePath } from "vite";
import { sync } from "glob";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { renderCards } from "./cards.js";

const PARTIALS_DIR = resolve(__dirname, "partials");
const TEMPLATE_METADATA = normalizePath(
  resolve(__dirname, "scripts/template-metadata.json"),
);

// Replaces each `<!-- include partials/name.html -->` line with that file, at
// the line's indentation. It runs in the dev server and in the build, so each
// page that ships is still one complete HTML file.
const includePartials = () => ({
  name: "include-partials",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(
        /^([ \t]*)<!-- include (partials\/[\w-]+\.html) -->$/gm,
        (_, indent, file) =>
          readFileSync(resolve(__dirname, file), "utf8")
            .trimEnd()
            .replace(/^(?=.)/gm, indent),
      ),
  },
  // A partial is not a module, so a change to one has to reload the page.
  handleHotUpdate({ file, server }) {
    if (file.startsWith(PARTIALS_DIR)) server.hot.send({ type: "full-reload" });
  },
});

// Writes the template cards into each page from the metadata. Like the
// partials, it runs before the build reads the page, so the cards ship as HTML.
const templateCards = () => ({
  name: "template-cards",
  enforce: "pre",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      renderCards(html, JSON.parse(readFileSync(TEMPLATE_METADATA, "utf8"))),
  },
  // The search script imports the metadata too. It gets only the fields it
  // reads, because the card text is already in the page.
  transform(code, id) {
    if (id !== TEMPLATE_METADATA) return null;
    const entries = Object.entries(JSON.parse(code)).map(
      ([file, { lastmod, image, title, categories }]) => [
        file,
        { lastmod, image, title, categories },
      ],
    );
    return JSON.stringify(Object.fromEntries(entries));
  },
  handleHotUpdate({ file, server }) {
    if (file === TEMPLATE_METADATA) server.hot.send({ type: "full-reload" });
  },
});

export default defineConfig({
  base: "/email-templates/",
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, "index.html"),
        resolve(__dirname, "preview.html"),
        resolve(__dirname, "supabase.html"),
        resolve(__dirname, "better-auth.html"),
        resolve(__dirname, "ecommerce-email-templates.html"),
        resolve(__dirname, "marketing-email-templates.html"),
        resolve(__dirname, "newsletter-email-templates.html"),
        resolve(__dirname, "account-email-templates.html"),
        resolve(__dirname, "auth-email-templates.html"),
        ...sync("./templates/**/*.html".replace(/\\/g, "/templates")),
      ],
    },
  },
  plugins: [
    includePartials(),
    templateCards(),
    ViteImageOptimizer({
      // SVGO cannot see external <symbol> references and would empty this sprite.
      exclude: /icons\.svg$/,
    }),
  ],
});
