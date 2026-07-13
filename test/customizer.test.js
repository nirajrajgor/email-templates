import assert from "node:assert/strict";
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
