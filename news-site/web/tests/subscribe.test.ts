import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "../src/lib/rate-limit";

/**
 * Newsletter signup (runbook gap G-1). The action checks the form; the data
 * layer sends the address to Sanity (unchanged) or, with CONTENT_SOURCE=cms,
 * to the CMS through its secret-protected endpoint.
 */

let requestHeaders: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requestHeaders),
}));

const sanityCalls = { fetch: vi.fn(), create: vi.fn(), writeClient: vi.fn() };
vi.mock("@/sanity/client", () => ({
  client: { fetch: vi.fn() },
  writeClient: () => sanityCalls.writeClient(),
}));

type Result = { ok: true } | { ok: false; error: string };

async function load(source: "sanity" | "cms") {
  vi.resetModules();
  if (source === "cms") vi.stubEnv("CONTENT_SOURCE", "cms");
  else vi.stubEnv("CONTENT_SOURCE", "");
  vi.stubEnv("CMS_URL", "http://cms.test/");
  const action = await import("../src/app/actions/subscribe");
  return (fields: Record<string, string>): Promise<Result> => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return action.subscribe(null, data);
  };
}

beforeEach(() => {
  requestHeaders = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
  sanityCalls.fetch.mockReset();
  sanityCalls.create.mockReset();
  sanityCalls.writeClient.mockReset();
  sanityCalls.writeClient.mockReturnValue({
    fetch: sanityCalls.fetch,
    create: sanityCalls.create,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signup with Sanity (CONTENT_SOURCE off): behaviour unchanged", () => {
  it("stores a new address with the time and the page it came from", async () => {
    sanityCalls.fetch.mockResolvedValue(null);
    requestHeaders.referer = "https://csnews.news/article/some-story?x=1";
    const subscribe = await load("sanity");

    expect(await subscribe({ email: "  New@Example.COM " })).toEqual({ ok: true });
    expect(sanityCalls.fetch).toHaveBeenCalledWith(expect.stringContaining("newsletterSubscriber"), {
      email: "new@example.com",
    });
    expect(sanityCalls.create).toHaveBeenCalledTimes(1);
    const doc = sanityCalls.create.mock.calls[0][0];
    expect(doc).toMatchObject({
      _type: "newsletterSubscriber",
      email: "new@example.com",
      source: "/article/some-story",
    });
    expect(Number.isNaN(Date.parse(doc.subscribedAt))).toBe(false);
  });

  it("treats an address already on the list as success without writing", async () => {
    sanityCalls.fetch.mockResolvedValue("existing-id");
    const subscribe = await load("sanity");
    expect(await subscribe({ email: "a@example.com" })).toEqual({ ok: true });
    expect(sanityCalls.create).not.toHaveBeenCalled();
  });

  it("fails closed with the same message when the write token is missing", async () => {
    sanityCalls.writeClient.mockImplementation(() => {
      throw new Error("SANITY_WRITE_TOKEN is not set");
    });
    const subscribe = await load("sanity");
    expect(await subscribe({ email: "a@example.com" })).toEqual({
      ok: false,
      error: "Signups are not open yet — please try again later.",
    });
    expect(sanityCalls.create).not.toHaveBeenCalled();
  });

  it("is not rate limited (that is only for the CMS path) and never calls the CMS", async () => {
    sanityCalls.fetch.mockResolvedValue("existing-id");
    const cmsFetch = vi.fn();
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("sanity");
    for (let i = 0; i < 10; i++) {
      expect(await subscribe({ email: `a${i}@example.com` })).toEqual({ ok: true });
    }
    expect(cmsFetch).not.toHaveBeenCalled();
  });
});

describe("form checks, whichever backend", () => {
  it("rejects a bad address and ignores a filled honeypot without calling any backend", async () => {
    const cmsFetch = vi.fn();
    vi.stubGlobal("fetch", cmsFetch);
    for (const source of ["sanity", "cms"] as const) {
      const subscribe = await load(source);
      expect(await subscribe({ email: "nope" })).toEqual({ ok: false, error: "Enter a valid email address." });
      expect(await subscribe({ email: "bot@example.com", website: "http://spam" })).toEqual({ ok: true });
    }
    expect(sanityCalls.writeClient).not.toHaveBeenCalled();
    expect(cmsFetch).not.toHaveBeenCalled();
  });
});

describe("signup with the CMS (CONTENT_SOURCE=cms)", () => {
  const okResponse = () => new Response(JSON.stringify({ ok: true }), { status: 200 });

  it("sends only the address, with the shared secret, to the CMS endpoint; never touches Sanity", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "web-side-secret");
    const cmsFetch = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("cms");

    expect(await subscribe({ email: "Reader@Example.com" })).toEqual({ ok: true });

    expect(cmsFetch).toHaveBeenCalledTimes(1);
    const [url, init] = cmsFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://cms.test/api/newsletter-subscribers/subscribe");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-subscribe-secret"]).toBe("web-side-secret");
    expect(JSON.parse(init.body as string)).toEqual({ email: "reader@example.com" });
    expect(sanityCalls.writeClient).not.toHaveBeenCalled();
  });

  it("fails closed when the secret is not set, without calling the CMS", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "");
    const cmsFetch = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("cms");
    expect(await subscribe({ email: "a@example.com" })).toEqual({
      ok: false,
      error: "Signups are not open yet — please try again later.",
    });
    expect(cmsFetch).not.toHaveBeenCalled();
  });

  it("turns the CMS's answers into messages a visitor can use, and never reveals the secret", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "web-side-secret");
    const cases: [number, string][] = [
      [400, "Enter a valid email address."],
      [429, "Too many attempts — please try again in a few minutes."],
      [401, "Signups are not open yet — please try again later."],
      [503, "Signups are not open yet — please try again later."],
      [500, "Signups are not open yet — please try again later."],
    ];
    for (const [status, message] of cases) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
      const subscribe = await load("cms");
      const result = await subscribe({ email: `s${status}@example.com` });
      expect(result).toEqual({ ok: false, error: message });
      expect(JSON.stringify(result)).not.toContain("web-side-secret");
    }
  });

  it("answers a failed or unreachable CMS with a retry message", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "web-side-secret");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    }));
    const subscribe = await load("cms");
    expect(await subscribe({ email: "a@example.com" })).toEqual({
      ok: false,
      error: "Something went wrong — please try again.",
    });
  });

  it("limits each visitor to 5 attempts, without calling the CMS for the rest", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "web-side-secret");
    const cmsFetch = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("cms");

    for (let i = 0; i < 5; i++) expect(await subscribe({ email: `v${i}@example.com` })).toEqual({ ok: true });
    expect(await subscribe({ email: "v6@example.com" })).toEqual({
      ok: false,
      error: "Too many attempts — please try again in a few minutes.",
    });
    expect(cmsFetch).toHaveBeenCalledTimes(5);

    // A different visitor is not affected.
    requestHeaders = { "x-forwarded-for": "198.51.100.9" };
    expect(await subscribe({ email: "other@example.com" })).toEqual({ ok: true });
  });

  it("keeps visitors whose address is hidden in one larger shared bucket", async () => {
    vi.stubEnv("CMS_SUBSCRIBE_SECRET", "web-side-secret");
    requestHeaders = {};
    const cmsFetch = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("cms");
    for (let i = 0; i < 30; i++) expect(await subscribe({ email: `u${i}@example.com` })).toEqual({ ok: true });
    expect((await subscribe({ email: "u31@example.com" })).ok).toBe(false);
    expect(cmsFetch).toHaveBeenCalledTimes(30);
  });
});

describe("rate limiter", () => {
  it("allows up to the maximum, then refuses, then recovers when the window passes", () => {
    let now = 1_000;
    const limiter = createRateLimiter({ windowMs: 60_000, now: () => now });
    expect([1, 2, 3].map(() => limiter.allow("k", 3))).toEqual([true, true, true]);
    expect(limiter.allow("k", 3)).toBe(false);
    expect(limiter.allow("other", 3)).toBe(true);
    now += 61_000;
    expect(limiter.allow("k", 3)).toBe(true);
  });

  it("does not grow without bound", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxKeys: 3 });
    for (let i = 0; i < 10; i++) limiter.allow(`k${i}`, 1);
    // The oldest keys were forgotten, so they are allowed again.
    expect(limiter.allow("k0", 1)).toBe(true);
    // The newest is still remembered.
    expect(limiter.allow("k9", 1)).toBe(false);
  });
});
