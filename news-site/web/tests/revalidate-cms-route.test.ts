import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));

import { POST } from "../src/app/api/revalidate-cms/route";

const SECRET = "test-secret-value-1234567890";

function call(options: { secret?: string | null; body?: unknown; raw?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.secret !== null) headers["x-revalidate-secret"] = options.secret ?? SECRET;
  return POST(
    new NextRequest("http://localhost/api/revalidate-cms", {
      method: "POST",
      headers,
      body: options.raw ?? JSON.stringify(options.body ?? { type: "article", slug: "a-story", categorySlug: "world" }),
    }),
  );
}

describe("POST /api/revalidate-cms", () => {
  beforeEach(() => {
    vi.stubEnv("REVALIDATE_SECRET", SECRET);
    revalidatePath.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses everything when no secret is configured", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    const res = await call();
    expect(res.status).toBe(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a missing, wrong, or almost-right secret", async () => {
    for (const secret of [null, "", "wrong", `${SECRET}x`, SECRET.slice(0, -1), SECRET.toUpperCase()]) {
      const res = await call({ secret });
      expect(res.status, `secret ${JSON.stringify(secret)}`).toBe(401);
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refreshes the article, its category, the front page, feeds and sitemaps", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const paths = revalidatePath.mock.calls.map(([p]) => p).sort();
    expect(paths).toEqual(
      ["/", "/article/a-story", "/category/world", "/feed.xml", "/news-sitemap.xml", "/sitemap.xml"].sort(),
    );
    expect((await res.json()).revalidated).toBe(true);
  });

  it("rejects bad input without refreshing anything", async () => {
    expect((await call({ raw: "not json" })).status).toBe(400);
    expect((await call({ body: {} })).status).toBe(400);
    expect((await call({ body: { type: 7 } })).status).toBe(400);
    expect((await call({ raw: JSON.stringify({ type: "article", pad: "x".repeat(3000) }) })).status).toBe(413);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores slugs that are not well-formed", async () => {
    await call({ body: { type: "article", slug: "../../etc/passwd", categorySlug: "A B" } });
    const paths = revalidatePath.mock.calls.map(([p]) => p);
    expect(paths.some((p) => p.includes(".."))).toBe(false);
    expect(paths.some((p) => p.startsWith("/article/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("/category/"))).toBe(false);
    expect(paths).toContain("/");
  });
});
