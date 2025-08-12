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

// Template metadata for custom lastmod dates and images
const TEMPLATE_METADATA = {
  "purchase-confirmation.html": {
    lastmod: "2024-11-08",
    image: "purchase-confirm-preview.png",
    title: "Purchase Confirmation Email Template",
  },
  "product-confirmation.html": {
    lastmod: "2024-11-08",
    image: "product-confirm-preview.png",
    title: "Product Confirmation Email Template",
  },
  "ecommerce-order.html": {
    lastmod: "2024-11-18",
    image: "ecommerce-order-emailer.jpg",
    title: "Ecommerce Order Email Template",
  },
  "promotional-offer.html": {
    lastmod: "2024-11-20",
    image: "promotional-offer-preview.png",
    title: "Promotional Offer Email Template",
  },
  "shopping-deals.html": {
    lastmod: "2024-12-09",
    image: "shopping-deals-preview.png",
    title: "Shopping Deals Email Template",
  },
  "gift-decor.html": {
    lastmod: "2025-01-06",
    image: "gift-decor-preview.jpg",
    title: "Gift Decor Email Template",
  },
  "product-announcements.html": {
    lastmod: "2025-05-22",
    image: "product-announcements-preview.png",
    title: "Product Announcements Email Template",
  },
  "ai-newsletter.html": {
    lastmod: "2025-02-22",
    image: "ai-newsletter-preview.jpg",
    title: "AI Newsletter Email Template",
  },
  "music-event-promotion.html": {
    lastmod: "2025-05-28",
    image: "music-event-promotion-preview.png",
    title: "Music Event Promotion Email Template",
  },
  "password-reset.html": {
    lastmod: "2025-08-07",
    image: "password-reset-preview.png",
    title: "Password Reset Email Template",
  },
  "abandoned-cart.html": {
    lastmod: "2025-08-11",
    image: "abandoned-cart-preview.png",
    title: "Abandoned Cart HTML Email Template",
  },
};

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
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>`;

      if (isMainPage) {
        urlXml += `
    <image:image>
      <image:loc>${BASE_URL}logo.svg</image:loc>
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
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>`;

      if (metadata && metadata.image) {
        urlXml += `
    <image:image>
      <image:loc>${BASE_URL}${metadata.image}</image:loc>
      <image:title>${metadata.title}</image:title>
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

  const htmlFiles = glob.sync("**/*.html", { cwd: DIST_DIR, nodir: true });
  const urls = [];

  htmlFiles.forEach((file) => {
    const fullPath = path.join(DIST_DIR, file);
    injectSeo(fullPath);
    urls.push(toUrl(fullPath));
  });

  // Enhanced Sitemap with metadata
  const sitemap = buildSitemap(urls);
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf8");

  // Enhanced Robots.txt with detailed rules
  const robots = buildRobots();
  fs.writeFileSync(path.join(DIST_DIR, "robots.txt"), robots, "utf8");

  console.log(
    "Enhanced SEO assets generated: sitemap.xml (with image metadata), robots.txt (with detailed rules), canonical tags, JSON-LD"
  );
}

run();
