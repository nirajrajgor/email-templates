import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { rethemeHtml } from "../customizer.js";

const linkTemplateVariables = [
  "ConfirmationURL",
  "ConfirmationURL",
  "ConfirmationURL",
  "Email",
];

const supabaseTemplates = [
  {
    file: "supabase-confirm-signup.html",
    label: "Confirm Signup",
    variables: linkTemplateVariables,
    maxWidth: 600,
    actionClass: "confirm-button",
    fixedLayout: true,
    hasVmlButton: true,
  },
  {
    file: "supabase-reset-password.html",
    label: "Reset Password",
    variables: linkTemplateVariables,
    maxWidth: 520,
    actionClass: "reset-button",
    fullWidthAction: true,
    hasVmlButton: true,
  },
  {
    file: "supabase-magic-link.html",
    label: "Magic Link",
    variables: linkTemplateVariables,
    maxWidth: 520,
    actionClass: "signin-button",
    fullWidthAction: true,
    fixedLayout: true,
    hasVmlButton: true,
    recommendedContent:
      /Follow the link below to sign in\. This link expires shortly\s+and can only be used once\./,
  },
  {
    file: "supabase-email-otp.html",
    label: "Email OTP",
    variables: ["Email", "Token"],
    maxWidth: 520,
    fixedLayout: true,
    hasOtpCode: true,
  },
  {
    file: "supabase-invite-user.html",
    label: "Invite User",
    variables: [
      "ConfirmationURL",
      "ConfirmationURL",
      "ConfirmationURL",
    ],
    maxWidth: 520,
    actionClass: "invite-button",
    fullWidthAction: true,
    fixedLayout: true,
    hasVmlButton: true,
    excludesEmail: true,
    recommendedContent:
      /You&rsquo;ve been invited to create an account\. Follow the link\s+below to accept\./,
  },
];

const readTemplate = (file) =>
  readFile(new URL(`../templates/${file}`, import.meta.url), "utf8");

const getSupabaseVariableNames = (html) =>
  [...html.matchAll(/{{\s+\.([A-Za-z][A-Za-z0-9_]*)\s+}}/g)]
    .map(([, name]) => name)
    .sort();

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
  for (const template of supabaseTemplates) {
    const html = await readTemplate(template.file);

    const themed = rethemeHtml(html, [
      { from: "#4f46e5", to: "#0ea5e9" },
    ]);

    assert.deepEqual(
      getSupabaseVariableNames(html),
      template.variables,
      `${template.file} has the expected variables`,
    );
    assert.deepEqual(
      getSupabaseVariableNames(themed),
      template.variables,
      `${template.file} preserves variables after customization`,
    );
    assert.match(themed, /background-color: #0ea5e9/);
    if (template.hasVmlButton) {
      assert.match(themed, /fillcolor="#0ea5e9"/);
    }
  }
});

for (const template of supabaseTemplates) {
  test(`${template.label} keeps its email-client safeguards`, async () => {
    const html = await readTemplate(template.file);
    const outerTable = html.match(
      /<table\s+role="presentation"[\s\S]*?<tr>/,
    )?.[0];
    const card = html.match(
      /<table\b(?=[^>]*class="email-shell email-card")[^>]*>/,
    )?.[0];

    assert.ok(outerTable, `${template.file} has an outer email table`);
    assert.match(outerTable, /width: 100% !important/);
    assert.match(outerTable, /min-width: 100%/);
    assert.match(outerTable, /margin: 0 auto/);
    if (template.fixedLayout) {
      assert.match(outerTable, /table-layout: fixed/);
    }

    assert.ok(card, `${template.file} has a centered email card`);
    assert.match(card, /align="center"/);
    assert.match(card, new RegExp(`max-width: ${template.maxWidth}px`));
    assert.match(card, /margin: 0 auto/);
    assert.doesNotMatch(card, /border-radius/);

    if (template.actionClass) {
      const action = html.match(
        new RegExp(
          `<a\\b(?=[^>]*class="${template.actionClass}")[^>]*>`,
        ),
      )?.[0];
      assert.ok(action, `${template.file} has its primary action`);
      assert.match(action, /href="{{ \.ConfirmationURL }}"/);
      if (template.fullWidthAction) {
        assert.match(action, /width: 100%/);
        assert.match(action, /min-width: 100%/);
        assert.match(action, /box-sizing: border-box/);
      }
    }

    if (template.recommendedContent) {
      assert.match(html, template.recommendedContent);
    }

    if (template.excludesEmail) {
      assert.doesNotMatch(html, /{{\s+\.Email\s+}}/);
    }

    if (template.hasOtpCode) {
      const otpCode = html.match(
        /<span\b(?=[^>]*class="otp-code")[\s\S]*?<\/span\s*>/,
      )?.[0];
      assert.ok(otpCode, `${template.file} has a one-time code display`);
      assert.match(otpCode, /{{ \.Token }}/);
      assert.match(otpCode, /Courier/);
      assert.match(otpCode, /letter-spacing/);
      assert.match(
        html,
        /\.otp-code\s*{[\s\S]*?font-size: 24px !important;[\s\S]*?white-space: nowrap !important;/,
      );
    }
  });
}
