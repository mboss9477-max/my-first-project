import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Live-site bugs found by Gemini's SEO audit (brief 07), each confirmed on the
 * live site before the fix: the share image crashed, the sitemap left out topic
 * and author pages, robots.txt had a protocol in its Host line, and the search
 * page declared the home page as its canonical address.
 */

const data = {
  getArticle: vi.fn(),
  getSitemapArticles: vi.fn(),
  getCategorySlugs: vi.fn(),
  getTopicSlugs: vi.fn(),
  getAuthorSlugs: vi.fn(),
  searchArticles: vi.fn(),
};
vi.mock("@/data", () => ({
  getArticle: (...args: unknown[]) => data.getArticle(...args),
  getSitemapArticles: () => data.getSitemapArticles(),
  getCategorySlugs: () => data.getCategorySlugs(),
  getTopicSlugs: () => data.getTopicSlugs(),
  getAuthorSlugs: () => data.getAuthorSlugs(),
  searchArticles: (...args: unknown[]) => data.searchArticles(...args),
}));

// next/og renders images with native code; the test only needs to see what it was given.
const rendered: unknown[] = [];
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown) {
      rendered.push(element);
    }
  },
}));

beforeEach(() => {
  for (const fn of Object.values(data)) fn.mockReset();
  rendered.length = 0;
});

describe("share image route", () => {
  it("looks the article up by the slug from Next 16's asynchronous params", async () => {
    data.getArticle.mockResolvedValue({ headline: "A story", category: "World" });
    const { default: Image } = await import("../src/app/article/[slug]/opengraph-image");
    await Image({ params: Promise.resolve({ slug: "a-story" }) });
    expect(data.getArticle).toHaveBeenCalledWith("a-story");
    expect(rendered).toHaveLength(1);
  });

  it("still renders a card with the site name when the article is not found", async () => {
    data.getArticle.mockResolvedValue(null);
    const { default: Image } = await import("../src/app/article/[slug]/opengraph-image");
    await Image({ params: Promise.resolve({ slug: "missing" }) });
    expect(rendered).toHaveLength(1);
  });
});

describe("sitemap", () => {
  it("lists the home page, categories, topics, authors and articles", async () => {
    data.getSitemapArticles.mockResolvedValue([{ slug: "story-one", publishedAt: "2026-08-01T00:00:00Z" }]);
    data.getCategorySlugs.mockResolvedValue(["world"]);
    data.getTopicSlugs.mockResolvedValue(["climate"]);
    data.getAuthorSlugs.mockResolvedValue(["staff"]);
    const { default: sitemap } = await import("../src/app/sitemap");
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls).toEqual(
      expect.arrayContaining(["/", "/category/world", "/topic/climate", "/author/staff", "/article/story-one"]),
    );
  });
});

describe("robots.txt", () => {
  it("gives a host name, not an address, in the Host line", async () => {
    const { default: robots } = await import("../src/app/robots");
    const { host } = robots();
    expect(host).toBeDefined();
    expect(host).not.toMatch(/^https?:/);
    expect(host).not.toContain("/");
  });
});

describe("search page metadata", () => {
  it("is its own canonical address and stays out of the index", async () => {
    vi.doMock("@/components/ArticleRow", () => ({ ArticleRow: () => null }));
    vi.doMock("@/components/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
    vi.doMock("@/components/SearchForm", () => ({ SearchForm: () => null }));
    const { metadata } = await import("../src/app/search/page");
    expect(metadata.alternates?.canonical).toBe("/search");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
