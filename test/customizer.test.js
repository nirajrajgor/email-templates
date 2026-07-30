import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { rethemeHtml } from "../customizer.js";

const linkVariables = [
  "ConfirmationURL",
  "ConfirmationURL",
  "ConfirmationURL",
  "Email",
];

const supabaseTemplates = [
  ["supabase-confirm-signup.html", linkVariables],
  [
    "supabase-change-email.html",
    [
      "ConfirmationURL",
      "ConfirmationURL",
      "ConfirmationURL",
      "NewEmail",
      "NewEmail",
    ],
  ],
  ["supabase-reset-password.html", linkVariables],
  ["supabase-magic-link.html", linkVariables],
  ["supabase-reauthentication.html", ["Token"]],
  ["supabase-email-otp.html", ["Email", "Token"]],
  [
    "supabase-invite-user.html",
    ["ConfirmationURL", "ConfirmationURL", "ConfirmationURL"],
  ],
];

const betterAuthTemplates = [
  ["better-auth-verify-email.html", ["email", "url"]],
  ["better-auth-reset-password.html", ["email", "url"]],
  ["better-auth-magic-link.html", ["email", "url"]],
  ["better-auth-delete-account.html", ["email", "url"]],
  ["better-auth-email-otp.html", ["email", "otp"]],
  ["better-auth-change-email.html", ["newEmail", "url"]],
  [
    "better-auth-invite-member.html",
    ["inviteLink", "inviterName", "organizationName"],
  ],
];

const getVariables = (html) =>
  [...html.matchAll(/{{\s+\.([A-Za-z][A-Za-z0-9_]*)\s+}}/g)]
    .map(([, name]) => name)
    .sort();

const getBetterAuthVariables = (html) =>
  [
    ...new Set(
      [...html.matchAll(/\$\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(
        ([, name]) => name,
      ),
    ),
  ].sort();

test("rethemes email style contexts without changing text", () => {
  const html = `
    <style>.cta { background: #667eea; }</style>
    <td bgcolor="#667eea" style='background: #667eea'>
      <svg fill="#667eea"></svg>
      <v:roundrect fillcolor="#667eea"></v:roundrect>
    </td>
    <p>Reference #667eea</p>
  `;
  const themed = rethemeHtml(html, [{ from: "#667eea", to: "#e11d48" }]);

  assert.match(themed, /background: #e11d48/);
  assert.match(themed, /bgcolor="#e11d48"/);
  assert.match(themed, /fill="#e11d48"/);
  assert.match(themed, /fillcolor="#e11d48"/);
  assert.match(themed, /<p>Reference #667eea<\/p>/);
});

test("Supabase variables survive customization", async () => {
  for (const [file, expected] of supabaseTemplates) {
    const html = await readFile(
      new URL(`../templates/${file}`, import.meta.url),
      "utf8",
    );
    const themed = rethemeHtml(html, [
      { from: "#4f46e5", to: "#0ea5e9" },
    ]);

    assert.deepEqual(getVariables(html), expected, file);
    assert.deepEqual(getVariables(themed), expected, file);
    assert.match(themed, /background-color: #0ea5e9/);
  }
});

test("Better Auth placeholders survive customization", async () => {
  for (const [file, expected] of betterAuthTemplates) {
    const html = await readFile(
      new URL(`../templates/${file}`, import.meta.url),
      "utf8",
    );
    const themed = rethemeHtml(
      html,
      [{ from: "#18181b", to: "#0ea5e9" }],
      { themedExtra: ["#18181b"] },
    );

    // Files are pasted into JS template literals, so backticks would break them.
    assert.doesNotMatch(html, /`/, file);
    assert.deepEqual(getBetterAuthVariables(html), expected, file);
    assert.deepEqual(getBetterAuthVariables(themed), expected, file);
    assert.match(themed, /background-color: #0ea5e9/);
  }
});
