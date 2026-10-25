import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cmsSource } from "../src/data/cms";
import { imageUrl } from "../src/data/image";

/**
 * The CMS implementation of the data seam, with the CMS's REST API stubbed:
 * what is asked for, and how the answer is mapped to the site's shapes.
 */
const calls: string[] = [];
let respond: (url: URL) => unknown;

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv("CMS_URL", "http://cms.test/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      calls.push(input);
      return new Response(JSON.stringify(respond(new URL(input))), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const media = {
  id: 7,
  alt: "Boat",
  caption: "Dawn",
  url: "http://cms.test/api/media/file/b.jpg",
  width: 3000,
  height: 2000,
  sizes: {
    thumbnail: { url: "/api/media/file/b-400.jpg", width: 400 },
    hero: { url: "/api/media/file/b-1600.jpg", width: 1600 },
  },
};

const articleDoc = {
  id: 42,
  headline: "Rates settle",
  slug: "rates-settle",
  excerpt: "Short",
  byline: "Guest",
  author: { id: 1, name: "Sam Writer", slug: "sam-writer", role: "Reporter", bio: "Bio" },
  publishedAt: "2026-08-29T12:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
  revisedAt: null,
  category: { id: 5, name: "Business", slug: "business" },
  topics: [{ id: 9, name: "Trade", slug: "trade" }, 3],
  featured: true,
  heroImage: media,
  body: {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Hi", format: 0 }] },
        { type: "upload", value: media },
      ],
    },
  },
  corrections: [{ correctedAt: "2026-09-01", note: "Fixed", id: "x" }],
};

describe("cmsSource", () => {
  it("maps an article, and shows the revision date as the updated date", async () => {
    respond = () => ({ docs: [articleDoc], totalDocs: 1 });
    const article = await cmsSource.getArticle("rates-settle");

    expect(article).toMatchObject({
      _id: "42",
      headline: "Rates settle",
      byline: "Sam Writer", // the author's name beats the byline override
      authorSlug: "sam-writer",
      authorRole: "Reporter",
      category: "Business",
      categorySlug: "business",
      topics: [{ name: "Trade", slug: "trade" }], // unpopulated ids dropped
      updatedAt: null, // revisedAt is empty, so no "Updated" line
      corrections: [{ correctedAt: "2026-09-01", note: "Fixed" }],
    });
    expect(article?.heroImage).toMatchObject({ alt: "Boat", dimensions: { width: 3000, height: 2000 } });

    // Upload nodes carry a ready image instead of the CMS media record.
    const body = article?.body;
    expect(body?.format).toBe("lexical");
    if (body?.format === "lexical") {
      const upload = body.root.children?.[1];
      expect(upload?.image?.alt).toBe("Boat");
      expect("value" in (upload ?? {})).toBe(false);
    }
    expect(calls[0]).toContain("http://cms.test/api/articles?");
    expect(decodeURIComponent(calls[0])).toContain("where[slug][equals]=rates-settle");
  });

  it("returns null when there is no such article, category, topic or author", async () => {
    respond = () => ({ docs: [], totalDocs: 0 });
    expect(await cmsSource.getArticle("nope")).toBeNull();
    expect(await cmsSource.getCategoryPage("nope", 0, 10)).toBeNull();
    expect(await cmsSource.getTopic("nope")).toBeNull();
    expect(await cmsSource.getAuthor("nope")).toBeNull();
  });

  it("gives a category page its total and the requested slice", async () => {
    respond = (url) =>
      url.pathname.endsWith("/categories")
        ? { docs: [{ id: 5, name: "Business", slug: "business" }], totalDocs: 1 }
        : {
            docs: [1, 2, 3, 4].map((n) => ({ ...articleDoc, id: n, slug: `a${n}` })),
            totalDocs: 4,
          };
    const page = await cmsSource.getCategoryPage("business", 2, 4);
    expect(page?.total).toBe(4);
    expect(page?.articles.map((a) => a.slug)).toEqual(["a3", "a4"]);
  });

  it("asks for the front page in featured-then-date order", async () => {
    respond = () => ({ docs: [], totalDocs: 0 });
    await cmsSource.getLatestArticles(8);
    const query = decodeURIComponent(calls[0]);
    expect(query).toContain("sort=-featured,-publishedAt");
    expect(query).toContain("limit=8");
  });

  it("search with no term asks nothing; related with no category returns nothing", async () => {
    respond = () => ({ docs: [], totalDocs: 0 });
    expect(await cmsSource.searchArticles("")).toEqual([]);
    expect(await cmsSource.getRelatedArticles("1", null)).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("fails loudly when the CMS answers with an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    await expect(cmsSource.getArticleSlugs()).rejects.toThrow(/CMS request failed \(500\)/);
  });

  it("gives the feed and sitemaps their own refresh windows", async () => {
    const seen: Record<string, number | undefined> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: { next?: { revalidate?: number } }) => {
        seen[new URL(input).searchParams.get("limit") ?? ""] = init?.next?.revalidate;
        return new Response(JSON.stringify({ docs: [], totalDocs: 0 }), { status: 200 });
      }),
    );
    await cmsSource.getFeedItems(); // limit 50
    await cmsSource.getNewsSitemapItems("2026-01-01"); // limit 1000
    await cmsSource.getSitemapArticles(); // limit 0
    expect(seen).toEqual({ "50": 600, "1000": 300, "0": 3600 });
  });
});

describe("imageUrl for CMS images", () => {
  const cms = {
    alt: null,
    caption: null,
    crop: null,
    dimensions: null,
    lqip: null,
    cms: {
      sizes: [
        { width: 400, url: "http://cms.test/s.jpg" },
        { width: 1600, url: "http://cms.test/l.jpg" },
      ],
    },
  };

  it("picks the smallest size that is wide enough, else the largest", () => {
    expect(imageUrl(cms, { width: 320, height: 240 })).toBe("http://cms.test/s.jpg");
    expect(imageUrl(cms, { width: 1200 })).toBe("http://cms.test/l.jpg");
    expect(imageUrl(cms, { width: 5000 })).toBe("http://cms.test/l.jpg");
  });
});
