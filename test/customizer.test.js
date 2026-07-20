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

test("Supabase variables survive brand-color customization", async () => {
  const files = [
    "supabase-confirm-signup.html",
    "supabase-reset-password.html",
  ];

  for (const file of files) {
    const html = await readFile(
      new URL(`../templates/${file}`, import.meta.url),
      "utf8",
    );

    const themed = rethemeHtml(html, [
      { from: "#3ecf8e", to: "#4f46e5" },
    ]);

    assert.match(themed, /{{ \.ConfirmationURL }}/);
    assert.match(themed, /{{ \.Email }}/);
    assert.doesNotMatch(themed, /{{ \.SiteURL }}/);
    assert.match(themed, /background-color: #4f46e5/);
    assert.match(themed, /fillcolor="#4f46e5"/);
  }
});

test("Supabase reset password keeps its email-client layout safeguards", async () => {
  const html = await readFile(
    new URL("../templates/supabase-reset-password.html", import.meta.url),
    "utf8",
  );
  const outerTable = html.match(
    /<table\s+role="presentation"[\s\S]*?<tr>/,
  )?.[0];
  const resetButton = html.match(
    /<a[\s\S]*?class="reset-button"[\s\S]*?<\/a\s*>/,
  )?.[0];

  assert.ok(outerTable, "expected the outer email table");
  assert.match(outerTable, /align="center"/);
  assert.match(outerTable, /min-width: 100%/);
  assert.match(outerTable, /margin: 0 auto/);

  assert.ok(resetButton, "expected the reset button link");
  assert.match(resetButton, /width: 100%/);
  assert.match(resetButton, /min-width: 100%/);
  assert.match(resetButton, /box-sizing: border-box/);
  assert.match(html, /Reset requested for<br \/>/);
});

test("Supabase confirm signup keeps a fluid canvas and centered card", async () => {
  const html = await readFile(
    new URL("../templates/supabase-confirm-signup.html", import.meta.url),
    "utf8",
  );
  const outerTable = html.match(
    /<table\s+role="presentation"[\s\S]*?<tr>/,
  )?.[0];
  const card = html.match(
    /<table[\s\S]*?class="email-shell email-card"[\s\S]*?>/,
  )?.[0];

  assert.ok(outerTable, "expected the outer email table");
  assert.match(outerTable, /width: 100% !important/);
  assert.match(outerTable, /min-width: 100%/);
  assert.match(outerTable, /table-layout: fixed/);

  assert.ok(card, "expected the centered email card");
  assert.match(card, /align="center"/);
  assert.match(card, /margin: 0 auto/);
  assert.match(html, /padding: 24px 24px 0/);
  assert.doesNotMatch(card, /border-radius/);
});
