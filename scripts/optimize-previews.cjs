// Caps card preview widths so the browser doesn't decode huge bitmaps
// (decoded RAM = width x height x 4). Only configured card grids are touched.
// Pass --check to fail (read-only) instead of writing, e.g. in the build.
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const sharp = require("sharp");

// ~360px card at 2x retina needs ~720px; 700 is a crisp, safe cap.
const MAX_WIDTH = 700;
const CHECK = process.argv.includes("--check");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const INDEX_HTML = path.join(ROOT, "index.html");
// The template cards are generated from the metadata, so it lists their images.
// The integration cards on the homepage are written by hand.
const TEMPLATE_METADATA = require("./template-metadata.json");
const INTEGRATION_CARD_IMAGES =
  "#collection-grid [data-integration-card] .integration-card-preview img";

function getCardImageSources() {
  const sources = new Set(
    Object.values(TEMPLATE_METADATA).map(({ image }) => image),
  );
  const $ = cheerio.load(fs.readFileSync(INDEX_HTML, "utf8"));
  $(INTEGRATION_CARD_IMAGES).each((_, el) => {
    const src = $(el).attr("src");
    if (src) sources.add(src.replace(/^\//, ""));
  });
  return [...sources];
}

async function optimize() {
  const sources = getCardImageSources();
  if (sources.length === 0) {
    console.warn("optimize-previews: no card preview images found");
    return;
  }

  let resized = 0;
  let skipped = 0;
  const oversized = [];

  for (const src of sources) {
    const file = path.join(PUBLIC_DIR, src);
    if (!fs.existsSync(file)) {
      console.warn(`optimize-previews: missing file ${src}`);
      continue;
    }

    const input = fs.readFileSync(file);
    const image = sharp(input);
    const { width, height } = await image.metadata();

    if (!width || width <= MAX_WIDTH) {
      skipped += 1;
      continue;
    }

    if (CHECK) {
      oversized.push(`${src} (${width}px wide)`);
      continue;
    }

    const output = await image
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .toBuffer();
    fs.writeFileSync(file, output);

    const newHeight = Math.round((height * MAX_WIDTH) / width);
    console.log(
      `optimize-previews: ${src}  ${width}x${height} -> ${MAX_WIDTH}x${newHeight}`,
    );
    resized += 1;
  }

  if (CHECK) {
    if (oversized.length) {
      console.error(
        `optimize-previews: ${oversized.length} preview image(s) exceed ${MAX_WIDTH}px:\n  ` +
          oversized.join("\n  ") +
          `\n  Run \`npm run optimize:previews\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(`optimize-previews: check passed (all <= ${MAX_WIDTH}px)`);
    return;
  }

  console.log(
    `optimize-previews: done (${resized} resized, ${skipped} already <= ${MAX_WIDTH}px)`,
  );
}

optimize().catch((err) => {
  console.error("optimize-previews failed:", err);
  process.exit(1);
});
