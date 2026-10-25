import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Guards the data seam (plan task 1.7): content is read through `src/data`,
 * so the CMS can be swapped without touching pages or components. Only the
 * seam itself and the Sanity helpers may import the Sanity client or queries.
 */
const SRC = path.resolve(__dirname, "../src");
const FORBIDDEN = /from\s+["']@\/sanity\/(client|queries)["']/;

// Known exceptions, each with the reason and where it gets removed. None now:
// the newsletter signup went through the seam too (runbook gap G-1).
const ALLOWED = new Set<string>([]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("data seam", () => {
  it("no page or component imports the Sanity client or queries directly", () => {
    const offenders = sourceFiles(SRC)
      .map((file) => path.relative(SRC, file).replace(/\\/g, "/"))
      .filter((rel) => !rel.startsWith("data/") && !rel.startsWith("sanity/") && !ALLOWED.has(rel))
      .filter((rel) => FORBIDDEN.test(readFileSync(path.join(SRC, rel), "utf8")));
    expect(offenders, "read content through @/data instead").toEqual([]);
  });

  it("the guard really detects a direct import", () => {
    expect(FORBIDDEN.test(`import { client } from "@/sanity/client";`)).toBe(true);
    expect(FORBIDDEN.test(`import type { Article } from "@/data";`)).toBe(false);
  });
});
