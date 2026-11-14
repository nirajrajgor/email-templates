import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "cheerio";

import seo from "../scripts/generate-seo.cjs";

const { buildFaqJsonLd, buildSitemap } = seo;

const BASE_URL = "https://nirajrajgor.github.io/email-templates/";

test("FAQ structured data mirrors the visible questions and answers", () => {
  const $ = load(
    `<section id="faq">
      <details>
        <summary><span>Is it free?</span><svg><use href="#icon"></use></svg></summary>
        <p>Yes. Choose <strong>Copy &rarr; Copy plain text</strong>.</p>
      </details>
      <details>
        <summary><span>How do I use it?</span></summary>
        <div><p>Follow these steps:</p><ol><li>Download</li><li>Edit</li></ol></div>
      </details>
    </section>`,
    { decodeEntities: false },
  );

  assert.deepEqual(buildFaqJsonLd($), {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is it free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose Copy → Copy plain text.",
        },
      },
      {
        "@type": "Question",
        name: "How do I use it?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Follow these steps: 1. Download 2. Edit",
        },
      },
    ],
  });
});

test("pages without a FAQ get no FAQ structured data", () => {
  assert.equal(buildFaqJsonLd(load("<main><details></details></main>")), null);
});

test("every homepage FAQ item has a question and an answer", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const $ = load(html, { decodeEntities: false });
  const { mainEntity } = buildFaqJsonLd($);

  assert.equal(mainEntity.length, $("#faq details").length);
  assert.ok(mainEntity.length > 0);
  for (const { name, acceptedAnswer } of mainEntity) {
    assert.match(name, /\?$/);
    assert.ok(acceptedAnswer.text.length > 0, `"${name}" has no answer`);
    assert.doesNotMatch(acceptedAnswer.text, /[<>]|&\w+;/);
  }
});

test("sitemap dates a page only when its last change is known", () => {
  const dated = `${BASE_URL}supabase.html`;
  const undated = `${BASE_URL}better-auth.html`;
  const sitemap = buildSitemap(
    [dated, undated],
    new Map([[dated, "2026-03-04"]]),
  );

  const entry = (url) =>
    sitemap.split("<url>").find((part) => part.includes(`<loc>${url}</loc>`));

  assert.match(entry(dated), /<lastmod>2026-03-04<\/lastmod>/);
  assert.doesNotMatch(entry(undated), /<lastmod>/);
});
