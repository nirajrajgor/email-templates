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
const GOOGLE_VERIFICATION_FILE = /^google[a-z0-9]+\.html$/i;

// Shared by sitemap generation and homepage catalog ordering.
const TEMPLATE_METADATA = require("./template-metadata.json");

function toUrl(filePath) {
  const relative = path.relative(DIST_DIR, filePath).replace(/\\/g, "/");
  // Collapse any trailing "index.html" so sub-folders map to a clean URL.
  const clean = relative.replace(/index\.html$/i, "");
  return `${BASE_URL}${clean}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hasNoIndex($) {
  return ($('meta[name="robots"]').attr("content") || "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
    .includes("noindex");
}

function injectSeo(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });
  const canonicalUrl = toUrl(htmlPath);
  const relativePath = path.relative(DIST_DIR, htmlPath);
  const isTemplatePage = relativePath.startsWith(`templates${path.sep}`);

  if (isTemplatePage) {
    const $robots = $('meta[name="robots"]');
    if ($robots.length > 0) {
      $robots.attr("content", "noindex, follow");
    } else {
      $("head").append(
        '\n    <meta name="robots" content="noindex, follow" />',
      );
    }
  }

  const noindex = hasNoIndex($);

  // Canonical tag
  if (!noindex && $('link[rel="canonical"]').length === 0) {
    $("head").append(`\n    <link rel="canonical" href="${canonicalUrl}" />`);
  }

  // JSON-LD
  if (!noindex && $('script[type="application/ld+json"]').length === 0) {
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
        jsonLd,
      )}</script>`,
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
  if (!noindex && !existingTwitter) {
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
      image = new URL(image, canonicalUrl).href;
    }
    $("head").append(
      `\n    <meta name="twitter:card" content="summary_large_image" />`,
    );
    $("head").append(`\n    <meta name="twitter:title" content="${title}" />`);
    $("head").append(
      `\n    <meta name="twitter:description" content="${desc}" />`,
    );
    if (image)
      $("head").append(
        `\n    <meta name="twitter:image" content="${image}" />`,
      );
  }

  fs.writeFileSync(htmlPath, $.html(), "utf8");

  return { noindex, url: canonicalUrl };
}

function buildSitemap(urls) {
  const today = new Date().toISOString().split("T")[0];

  // Sort URLs to put main page first, then templates
  const sortedUrls = urls.sort((a, b) => {
    if (a === BASE_URL) return -1;
    if (b === BASE_URL) return 1;
    return a.localeCompare(b);
  });

  // Separate main pages from templates
  const mainPages = [];
  const templatePages = [];

  sortedUrls.forEach((url) => {
    if (url.includes("/templates/")) {
      templatePages.push(url);
    } else {
      mainPages.push(url);
    }
  });

  // Generate XML for main pages
  const mainPageItems = mainPages
    .map((url) => {
      const isMainPage = url === BASE_URL;
      let urlXml = `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml(today)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>`;

      if (isMainPage) {
        urlXml += `
    <image:image>
      <image:loc>${escapeXml(`${BASE_URL}logo.svg`)}</image:loc>
      <image:title>Email Templates Logo</image:title>
    </image:image>`;
      }

      urlXml += `
  </url>`;
      return urlXml;
    })
    .join("\n");

  // Generate XML for template pages
  const templateItems = templatePages
    .map((url) => {
      const fileName = path.basename(url);
      const metadata = TEMPLATE_METADATA[fileName];
      const lastmod = metadata ? metadata.lastmod : today;

      let urlXml = `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>`;

      if (metadata && metadata.image) {
        urlXml += `
    <image:image>
      <image:loc>${escapeXml(`${BASE_URL}${metadata.image}`)}</image:loc>
      <image:title>${escapeXml(metadata.title)}</image:title>
    </image:image>`;
      }

      urlXml += `
  </url>`;
      return urlXml;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Main Pages -->
${mainPageItems}

  <!-- Email Templates -->
${templateItems}

</urlset>`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${BASE_URL}sitemap.xml

# Block access to certain file types
Disallow: /*.json$
Disallow: /*.config.*$
Disallow: /node_modules/
Disallow: /.git/

# Allow all CSS, JS, and image files
Allow: /*.css$
Allow: /*.js$
Allow: /*.png$
Allow: /*.jpg$
Allow: /*.jpeg$
Allow: /*.webp$
Allow: /*.svg$
Allow: /*.gif$

# Allow HTML files
Allow: /*.html$`;
}

function run() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("Dist directory does not exist. Run vite build first.");
    process.exit(1);
  }

  const htmlFiles = glob
    .sync("**/*.html", { cwd: DIST_DIR, nodir: true })
    .filter(
      (file) =>
        path.dirname(file) !== "." ||
        !GOOGLE_VERIFICATION_FILE.test(path.basename(file)),
    );
  const urls = [];

  htmlFiles.forEach((file) => {
    const fullPath = path.join(DIST_DIR, file);
    const { noindex, url } = injectSeo(fullPath);
    if (!noindex) urls.push(url);
  });

  // Enhanced Sitemap with metadata
  const sitemap = buildSitemap(urls);
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf8");

  // Enhanced Robots.txt with detailed rules
  const robots = buildRobots();
  fs.writeFileSync(path.join(DIST_DIR, "robots.txt"), robots, "utf8");

  console.log(
    "Enhanced SEO assets generated: sitemap.xml (with image metadata), robots.txt (with detailed rules), canonical tags, JSON-LD",
  );
}

run();
