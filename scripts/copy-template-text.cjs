const fs = require("fs");
const path = require("path");
const glob = require("glob");

const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");

if (!fs.existsSync(DIST_DIR)) {
  console.error("Dist directory does not exist. Run vite build first.");
  process.exit(1);
}

const textFiles = glob.sync("templates/**/*.txt", {
  cwd: ROOT,
  nodir: true,
});

textFiles.forEach((file) => {
  const source = path.join(ROOT, file);
  const destination = path.join(DIST_DIR, file);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
});

console.log(
  `Copied ${textFiles.length} plain-text template${
    textFiles.length === 1 ? "" : "s"
  }.`,
);
