import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LexicalBody } from "../src/components/LexicalBody";
import type { CmsImage, LexicalNode } from "../src/data";
import { hasBodyContent, readingTime } from "../src/lib/reading-time";

const text = (value: string, format = 0): LexicalNode => ({
  type: "text",
  text: value,
  format,
});
const root = (...children: LexicalNode[]): LexicalNode => ({
  type: "root",
  children,
});
const html = (...children: LexicalNode[]) =>
  renderToStaticMarkup(<LexicalBody root={root(...children)} />);

const image: CmsImage = {
  alt: "A boat",
  caption: "Taken at dawn",
  crop: null,
  dimensions: { width: 1600, height: 900 },
  lqip: null,
  cms: {
    sizes: [
      { width: 400, url: "http://cms.test/api/media/file/a-400x225.jpg" },
      { width: 1600, url: "http://cms.test/api/media/file/a-1600x900.jpg" },
    ],
  },
};

describe("LexicalBody", () => {
  it("renders paragraphs, headings and quotes", () => {
    const out = html(
      { type: "heading", tag: "h2", children: [text("Title")] },
      { type: "paragraph", children: [text("Body")] },
      { type: "quote", children: [text("Said")] },
    );
    expect(out).toContain("<h2");
    expect(out).toContain(">Title</h2>");
    expect(out).toContain(">Body</p>");
    expect(out).toContain("<blockquote");
  });

  it("applies bold, italic, underline, strike-through and code", () => {
    expect(html({ type: "paragraph", children: [text("x", 1)] })).toContain("<strong>x</strong>");
    expect(html({ type: "paragraph", children: [text("x", 2)] })).toContain("<em>x</em>");
    expect(html({ type: "paragraph", children: [text("x", 8)] })).toContain("<u>x</u>");
    expect(html({ type: "paragraph", children: [text("x", 4)] })).toContain("<s>x</s>");
    expect(html({ type: "paragraph", children: [text("x", 16)] })).toContain("<code>x</code>");
    expect(html({ type: "paragraph", children: [text("x", 3)] })).toMatch(/<em><strong>x<\/strong><\/em>/);
  });

  it("renders bullet and numbered lists", () => {
    const item = (t: string): LexicalNode => ({ type: "listitem", children: [text(t)] });
    const out = html(
      { type: "list", listType: "bullet", children: [item("a"), item("b")] },
      { type: "list", listType: "number", children: [item("c")] },
    );
    expect(out).toMatch(/<ul[^>]*><li>a<\/li><li>b<\/li><\/ul>/);
    expect(out).toMatch(/<ol[^>]*><li>c<\/li><\/ol>/);
  });

  it("links web addresses but never javascript: addresses", () => {
    const link = (url: string): LexicalNode => ({
      type: "link",
      fields: { url },
      children: [text("click")],
    });
    const good = html({ type: "paragraph", children: [link("https://example.com/a")] });
    expect(good).toContain('href="https://example.com/a"');
    expect(good).toContain('rel="noreferrer noopener"');

    const bad = html({ type: "paragraph", children: [link("javascript:alert(1)")] });
    expect(bad).not.toContain("href");
    expect(bad).toContain("click");
  });

  it("renders an upload as a captioned figure with the sized CMS URL", () => {
    const out = html({ type: "upload", image });
    expect(out).toContain("<figure");
    expect(out).toContain('alt="A boat"');
    expect(out).toContain("Taken at dawn");
    expect(out).toContain("a-1600x900.jpg");
  });

  it("skips an upload with no image and any unknown node", () => {
    expect(html({ type: "upload", image: null })).toBe("");
    expect(html({ type: "somethingNew", children: [text("lost")] })).toBe("");
  });
});

describe("reading time for a Lexical body", () => {
  const words = (n: number) => text(Array(n).fill("word").join(" "));

  it("counts text across nested nodes and ignores uploads", () => {
    const body = {
      format: "lexical" as const,
      root: root(
        { type: "paragraph", children: [words(220)] },
        { type: "list", listType: "bullet", children: [{ type: "listitem", children: [words(220)] }] },
        { type: "upload", image },
      ),
    };
    expect(readingTime(body)).toBe(2);
  });

  it("is null for an empty body", () => {
    expect(readingTime({ format: "lexical", root: root() })).toBeNull();
    expect(hasBodyContent({ format: "lexical", root: root() })).toBe(false);
    expect(hasBodyContent(null)).toBe(false);
  });
});
