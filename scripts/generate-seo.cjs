const fs = require("fs");
const path = require("path");
const glob = require("glob");
const cheerio = require("cheerio");

// === CONFIG ===
const BASE_URL = "https://nirajrajgor.github.io/email-templates/";
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const CHANGE_FREQ = "weekly";
const PUBLISHER_NAME = "Niraj Rajgor";

function toUrl(filePath) {
  const relative = path.relative(DIST_DIR, filePath).replace(/\\/g, "/");
  if (relative === "index.html") return BASE_URL;
  return `${BASE_URL}${relative}`;
}

function injectSeo(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });
  const canonicalUrl = toUrl(htmlPath);

  // Canonical tag
  if ($('link[rel="canonical"]').length === 0) {
    $("head").append(`\n    <link rel="canonical" href="${canonicalUrl}" />`);
  }

  // JSON-LD
  if ($('script[type="application/ld+json"]').length === 0) {
    const isRoot = canonicalUrl === BASE_URL;
    const jsonLd = isRoot
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: $("title").first().text().trim(),
          description: $('meta[name="description"]').attr("content") || "",
          url: canonicalUrl,
          publisher: {
            "@type": "Person",
            name: PUBLISHER_NAME,
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: $("title").first().text().trim(),
          description: $('meta[name="description"]').attr("content") || "",
          url: canonicalUrl,
          isAccessibleForFree: true,
          fileFormat: "text/html",
          publisher: {
            "@type": "Person",
            name: PUBLISHER_NAME,
          },
        };
    $("head").append(
      `\n    <script type="application/ld+json">${JSON.stringify(
        jsonLd
      )}</script>`
    );
  }

  fs.writeFileSync(htmlPath, $.html(), "utf8");
}

function buildSitemap(urls) {
  const today = new Date().toISOString().split("T")[0];
  const items = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${CHANGE_FREQ}</changefreq>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

function run() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("Dist directory does not exist. Run vite build first.");
    process.exit(1);
  }

  const htmlFiles = glob.sync("**/*.html", { cwd: DIST_DIR, nodir: true });
  const urls = [];

  htmlFiles.forEach((file) => {
    const fullPath = path.join(DIST_DIR, file);
    injectSeo(fullPath);
    urls.push(toUrl(fullPath));
  });

  // Sitemap
  const sitemap = buildSitemap(urls);
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf8");

  // Robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}sitemap.xml`;
  fs.writeFileSync(path.join(DIST_DIR, "robots.txt"), robots, "utf8");

  console.log(
    "SEO assets generated: sitemap.xml, robots.txt, canonical tags, JSON-LD"
  );
}

run();
