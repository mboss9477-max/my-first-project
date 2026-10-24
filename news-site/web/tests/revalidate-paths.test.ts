import { describe, expect, it } from "vitest";

import { pathsToRevalidate } from "../src/lib/revalidate-paths";

const ALWAYS = ["/", "/feed.xml", "/sitemap.xml", "/news-sitemap.xml"];

describe("pathsToRevalidate", () => {
  it("article: its page, its category page, plus the front page, feeds and sitemaps", () => {
    expect(
      pathsToRevalidate({ type: "article", slug: "a-story", categorySlug: "politics" }).sort(),
    ).toEqual([...ALWAYS, "/article/a-story", "/category/politics"].sort());
  });

  it("article without a category only refreshes its own page", () => {
    const paths = pathsToRevalidate({ type: "article", slug: "a-story", categorySlug: null });
    expect(paths).toContain("/article/a-story");
    expect(paths.some((p) => p.startsWith("/category/"))).toBe(false);
  });

  it("category, author and topic refresh their own page", () => {
    expect(pathsToRevalidate({ type: "category", slug: "world" })).toContain("/category/world");
    expect(pathsToRevalidate({ type: "author", slug: "jo" })).toContain("/author/jo");
    expect(pathsToRevalidate({ type: "topic", slug: "climate" })).toContain("/topic/climate");
  });

  it("always includes the front page, feeds and sitemaps, even for unknown types", () => {
    for (const type of ["article", "category", "author", "topic", "newsletterSubscriber"]) {
      expect(pathsToRevalidate({ type, slug: "x" })).toEqual(expect.arrayContaining(ALWAYS));
    }
  });

  it("ignores empty slugs instead of refreshing a bare prefix", () => {
    const paths = pathsToRevalidate({ type: "article", slug: "", categorySlug: "" });
    expect(paths.sort()).toEqual([...ALWAYS].sort());
  });

  it("has no duplicates", () => {
    const paths = pathsToRevalidate({ type: "article", slug: "s", categorySlug: "c" });
    expect(new Set(paths).size).toBe(paths.length);
  });
});
