const fs = require("fs");
const path = require("path");
const glob = require("glob");
const cheerio = require("cheerio");
const sizeOf = require("image-size");

// === CONFIG ===
const BASE_URL = "https://nirajrajgor.github.io/email-templates/";
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const CHANGE_FREQ = "weekly";
const PUBLISHER_NAME = "Niraj Rajgor";

function toUrl(filePath) {
  const relative = path.relative(DIST_DIR, filePath).replace(/\\/g, "/");
  // Collapse any trailing "index.html" so sub-folders map to a clean URL.
  const clean = relative.replace(/index\.html$/i, "");
  return `${BASE_URL}${clean}`;
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

  // Improve <img> tags: width, height, decoding="async"
  $("img").each((_, img) => {
    const $img = $(img);
    if (!$img.attr("width") || !$img.attr("height")) {
      let src = $img.attr("src") || "";
      if (src.startsWith("/")) src = src.substring(1);
      const imgPath = path.join(DIST_DIR, src);
      if (fs.existsSync(imgPath)) {
        try {
          const dim = sizeOf(imgPath);
          if (dim && dim.width && dim.height) {
            $img.attr("width", dim.width);
            $img.attr("height", dim.height);
          }
        } catch (_) {}
      }
    }
    if (!$img.attr("decoding")) $img.attr("decoding", "async");
  });

  // Twitter meta tags (summary_large_image)
  const existingTwitter = $('meta[name="twitter:card"]').length;
  if (!existingTwitter) {
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim();
    const desc =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
    let image = $('meta[property="og:image"]').attr("content");
    if (!image) {
      // fallback: first image in document
      const firstImg = $("img").first().attr("src");
      if (firstImg) image = firstImg;
    }
    if (image && !/^https?:/.test(image)) {
      image = image.startsWith("/")
        ? `${BASE_URL}${image.substring(1)}`
        : `${canonicalUrl}${image}`;
    }
    $("head").append(
      `\n    <meta name="twitter:card" content="summary_large_image" />`
    );
    $("head").append(`\n    <meta name="twitter:title" content="${title}" />`);
    $("head").append(
      `\n    <meta name="twitter:description" content="${desc}" />`
    );
    if (image)
      $("head").append(
        `\n    <meta name="twitter:image" content="${image}" />`
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
