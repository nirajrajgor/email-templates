import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { rethemeHtml } from "../customizer.js";

test("rethemes HTML, SVG, and Outlook VML color attributes", () => {
  const html = `
    <style>.cta { background: #667eea; }</style>
    <td bgcolor="#667eea" style='background: #667eea'>
      <svg fill="#667eea" stroke='#667eea'></svg>
      <v:roundrect fillcolor="#667eea" strokecolor='#667eea'></v:roundrect>
    </td>
    <p>Reference #667eea</p>
  `;

  const themed = rethemeHtml(html, [
    { from: "#667eea", to: "#e11d48" },
  ]);

  assert.match(themed, /background: #e11d48/);
  assert.match(themed, /bgcolor="#e11d48"/);
  assert.match(themed, /fill="#e11d48"/);
  assert.match(themed, /stroke='#e11d48'/);
  assert.match(themed, /fillcolor="#e11d48"/);
  assert.match(themed, /strokecolor='#e11d48'/);
  assert.match(themed, /<p>Reference #667eea<\/p>/);
});

test("every color swatch exposes an initial pressed state", async () => {
  const previewHtml = await readFile(
    new URL("../preview.html", import.meta.url),
    "utf8",
  );
  const swatches = previewHtml.match(
    /<button\s+class="swatch"[\s\S]*?<\/button>/g,
  );

  assert.ok(swatches?.length, "expected color swatch buttons");
  swatches.forEach((swatch) => {
    assert.match(swatch, /aria-pressed="false"/);
  });
});
