import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { rethemeHtml } from "../customizer.js";

const getSupabaseVariables = (html) =>
  html.match(/{{\s+\.[A-Za-z][A-Za-z0-9_]*\s+}}/g) ?? [];

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
    "supabase-magic-link.html",
    "supabase-reset-password.html",
  ];

  for (const file of files) {
    const html = await readFile(
      new URL(`../templates/${file}`, import.meta.url),
      "utf8",
    );

    const themed = rethemeHtml(html, [
      { from: "#4f46e5", to: "#0ea5e9" },
    ]);

    assert.match(themed, /{{ \.ConfirmationURL }}/);
    assert.match(themed, /{{ \.Email }}/);
    assert.deepEqual(getSupabaseVariables(themed), getSupabaseVariables(html));
    assert.match(themed, /background-color: #0ea5e9/);
    assert.match(themed, /fillcolor="#0ea5e9"/);
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

test("Supabase magic link keeps Supabase's recommended content", async () => {
  const html = await readFile(
    new URL("../templates/supabase-magic-link.html", import.meta.url),
    "utf8",
  );
  const outerTable = html.match(
    /<table\s+role="presentation"[\s\S]*?<tr>/,
  )?.[0];
  const card = html.match(
    /<table[\s\S]*?class="email-shell email-card"[\s\S]*?>/,
  )?.[0];
  const signinButton = html.match(
    /<a[\s\S]*?class="signin-button"[\s\S]*?<\/a\s*>/,
  )?.[0];

  assert.ok(outerTable, "expected the outer email table");
  assert.match(outerTable, /width: 100% !important/);
  assert.match(outerTable, /min-width: 100%/);

  assert.ok(card, "expected the centered email card");
  assert.match(card, /max-width: 520px/);
  assert.match(card, /margin: 0 auto/);

  assert.match(html, /Your sign-in link/);
  assert.match(
    html,
    /Follow the link below to sign in\. This link expires shortly\s+and can only be used once\./,
  );

  assert.ok(signinButton, "expected the sign-in button link");
  assert.match(signinButton, /href="{{ \.ConfirmationURL }}"/);
  assert.match(signinButton, /width: 100%/);
  assert.match(signinButton, /min-width: 100%/);
  assert.match(signinButton, /box-sizing: border-box/);
  assert.match(signinButton, />Sign in</);

  assert.doesNotMatch(html, /{{ \.Token }}/);
  assert.match(html, /This sign-in link\s+can only be used once\./);
});

test("Supabase email OTP keeps a prominent one-time code", async () => {
  const html = await readFile(
    new URL("../templates/supabase-email-otp.html", import.meta.url),
    "utf8",
  );
  const outerTable = html.match(
    /<table\s+role="presentation"[\s\S]*?<tr>/,
  )?.[0];
  const card = html.match(
    /<table[\s\S]*?class="email-shell email-card"[\s\S]*?>/,
  )?.[0];
  const otpCode = html.match(
    /<span[\s\S]*?class="otp-code"[\s\S]*?<\/span\s*>/,
  )?.[0];

  assert.ok(outerTable, "expected the outer email table");
  assert.match(outerTable, /width: 100% !important/);
  assert.match(outerTable, /min-width: 100%/);

  assert.ok(card, "expected the centered email card");
  assert.match(card, /max-width: 520px/);
  assert.match(card, /margin: 0 auto/);

  assert.match(html, /Your verification code/);
  assert.match(
    html,
    /Use the code below to verify your identity\. It expires\s+shortly\./,
  );
  assert.match(html, /{{ \.Email }}/);

  assert.ok(otpCode, "expected the one-time code display");
  assert.match(otpCode, /{{ \.Token }}/);
  assert.match(otpCode, /Courier/);
  assert.match(otpCode, /letter-spacing/);
  assert.match(
    html,
    /\.otp-code\s*{[\s\S]*?font-size: 24px !important;[\s\S]*?white-space: nowrap !important;/,
  );

  assert.doesNotMatch(html, /{{ \.ConfirmationURL }}/);
  assert.match(html, /Never share this\s+code with anyone\./);

  const themed = rethemeHtml(html, [{ from: "#4f46e5", to: "#0ea5e9" }]);
  assert.match(themed, /{{ \.Token }}/);
  assert.deepEqual(getSupabaseVariables(themed), getSupabaseVariables(html));
  assert.match(themed, /background-color: #0ea5e9/);
});
