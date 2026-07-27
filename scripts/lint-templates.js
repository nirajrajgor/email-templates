// Each rule maps to a real Gmail rendering failure observed via real sends.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const TEMPLATES_DIR = "templates";

const RULES = [
  {
    name: "space-separated rgb()/rgba()",
    pattern: /rgba?\(\s*[\d.]+\s+[\d.]+/,
    hint: "use comma syntax rgb(r, g, b) or hex — Gmail drops the whole style attribute otherwise",
  },
  {
    name: "css transform",
    pattern: /(?:(?<![a-zA-Z-])|-(?:webkit|moz|ms|o)-)transform\s*:/,
    hint: "Gmail strips transform; bake the effect into the image asset or drop it",
  },
  {
    name: "modern color function",
    pattern: /(?<![a-zA-Z-])(?:oklch|oklab|lch|lab|color-mix)\(/,
    hint: "unsupported in email clients; use hex or comma rgb()/rgba()",
  },
  {
    name: "css custom property",
    pattern: /var\(\s*--/,
    hint: "CSS variables are stripped by Gmail; inline the value",
  },
  {
    name: "non-absolute image src",
    pattern: /src="(?!https?:|data:|cid:)[^"]/,
    hint: "use absolute https URLs (assets live on https://nirajrajgor.github.io/email-templates/)",
  },
];

const files = (await readdir(TEMPLATES_DIR)).filter((f) => f.endsWith(".html"));
let findings = 0;

for (const file of files.sort()) {
  const lines = (await readFile(path.join(TEMPLATES_DIR, file), "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings++;
        console.error(`${TEMPLATES_DIR}/${file}:${i + 1} — ${rule.name}\n    ${line.trim().slice(0, 100)}\n    fix: ${rule.hint}`);
      }
    }
  });
}

if (findings > 0) {
  console.error(`\n${findings} problem(s) found across ${files.length} templates.`);
  process.exit(1);
}
console.log(`OK: ${files.length} templates pass email-safety lint.`);
