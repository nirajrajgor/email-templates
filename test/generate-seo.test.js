import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "cheerio";

import seo from "../scripts/generate-seo.cjs";

const { buildFaqJsonLd } = seo;

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
