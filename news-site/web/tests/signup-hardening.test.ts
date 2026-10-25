import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientKey } from "../src/lib/client-key";
import { createRateLimiter } from "../src/lib/rate-limit";

/**
 * Fixes for Gemini's adversarial round 2 (brief 04): who counts as "the same
 * visitor", the limiter's memory, and the signup action's failure paths.
 */

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

describe("clientKey (finding ADV2-4)", () => {
  it("trusts Cloudflare's address over anything the visitor wrote", () => {
    expect(
      clientKey(headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 10.0.0.2" })),
    ).toBe("203.0.113.9");
  });

  it("ignores the first x-forwarded-for entry, which the visitor controls, and uses the last", () => {
    // A visitor rotating the first entry must stay one visitor.
    const a = clientKey(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.2" }));
    const b = clientKey(headers({ "x-forwarded-for": "198.51.100.77, 10.0.0.2" }));
    expect(a).toBe("10.0.0.2");
    expect(b).toBe(a);
  });

  it("falls back to x-real-ip, then to one shared bucket", () => {
    expect(clientKey(headers({ "x-real-ip": "192.0.2.5" }))).toBe("192.0.2.5");
    expect(clientKey(headers({}))).toBe("unknown");
  });

  it("accepts IPv6 and refuses junk so a visitor cannot invent keys", () => {
    expect(clientKey(headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientKey(headers({ "cf-connecting-ip": "not an ip; drop table" }))).toBe("unknown");
    expect(clientKey(headers({ "cf-connecting-ip": "1".repeat(200) }))).toBe("unknown");
    expect(clientKey(headers({ "x-forwarded-for": "1.2.3.4, <script>" }))).toBe("unknown");
  });
});

// ---- the signup action's failure paths --------------------------------------

let requestHeaders: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requestHeaders),
}));

const sanity = { fetch: vi.fn(), create: vi.fn(), writeClient: vi.fn() };
vi.mock("@/sanity/client", () => ({
  client: { fetch: vi.fn() },
  writeClient: () => sanity.writeClient(),
}));

async function load(source: "sanity" | "cms") {
  vi.resetModules();
  vi.stubEnv("CONTENT_SOURCE", source === "cms" ? "cms" : "");
  vi.stubEnv("CMS_URL", "http://cms.test/");
  vi.stubEnv("CMS_SUBSCRIBE_SECRET", "secret-for-tests");
  const action = await import("../src/app/actions/subscribe");
  return async (email: string) => {
    const data = new FormData();
    data.set("email", email);
    return action.subscribe(null, data);
  };
}

beforeEach(() => {
  requestHeaders = { "cf-connecting-ip": "203.0.113.20" };
  sanity.fetch.mockReset();
  sanity.create.mockReset();
  sanity.writeClient.mockReset();
  sanity.writeClient.mockReturnValue({ fetch: sanity.fetch, create: sanity.create });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signup action", () => {
  it("a failing Sanity write is a plain message, not a crash", async () => {
    sanity.fetch.mockResolvedValue(null);
    sanity.create.mockRejectedValue(new Error("Insufficient permissions"));
    const subscribe = await load("sanity");
    expect(await subscribe("reader@example.com")).toEqual({
      ok: false,
      error: "Something went wrong — please try again.",
    });
  });

  it("a bad Referer header no longer breaks a Sanity signup; no source is recorded", async () => {
    sanity.fetch.mockResolvedValue(null);
    sanity.create.mockResolvedValue({});
    requestHeaders.referer = "http://[not a url";
    const subscribe = await load("sanity");
    expect(await subscribe("reader@example.com")).toEqual({ ok: true });
    expect(sanity.create).toHaveBeenCalledWith(expect.objectContaining({ email: "reader@example.com", source: null }));
  });

  it("rejects null bytes, control characters and over-long addresses before any backend (finding ADV2-3)", async () => {
    const cmsFetch = vi.fn();
    vi.stubGlobal("fetch", cmsFetch);
    for (const source of ["sanity", "cms"] as const) {
      const subscribe = await load(source);
      for (const email of ["a\u0000@example.com", "a@exa\u0001mple.com", `${"a".repeat(260)}@example.com`]) {
        expect(await subscribe(email)).toEqual({ ok: false, error: "Enter a valid email address." });
      }
    }
    expect(sanity.writeClient).not.toHaveBeenCalled();
    expect(cmsFetch).not.toHaveBeenCalled();
  });

  it("a visitor rotating a forged x-forwarded-for is still limited (finding ADV2-4)", async () => {
    const cmsFetch = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", cmsFetch);
    const subscribe = await load("cms");
    let blocked = 0;
    for (let i = 0; i < 8; i++) {
      requestHeaders = { "x-forwarded-for": `198.51.100.${i}, 10.9.9.9` };
      const result = await subscribe(`v${i}@example.com`);
      if (!result.ok) blocked++;
    }
    expect(blocked).toBe(3); // 5 allowed, 3 refused, whatever the forged first entry says
    expect(cmsFetch).toHaveBeenCalledTimes(5);
  });
});
