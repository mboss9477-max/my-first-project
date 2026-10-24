import { describe, it, expect } from "vitest";
import { escapeXml } from "../src/lib/xml";

describe("escapeXml", () => {
  it("returns plain text unchanged", () => {
    expect(escapeXml("Hello World 123")).toBe("Hello World 123");
  });

  it("escapes all five XML predefined entities", () => {
    expect(escapeXml("&")).toBe("&amp;");
    expect(escapeXml("<")).toBe("&lt;");
    expect(escapeXml(">")).toBe("&gt;");
    expect(escapeXml('"')).toBe("&quot;");
    expect(escapeXml("'")).toBe("&apos;");
  });

  it("escapes mixed text with multiple entities", () => {
    const input = `<title>Tom & Jerry "Special": Director's Cut</title>`;
    const expected = `&lt;title&gt;Tom &amp; Jerry &quot;Special&quot;: Director&apos;s Cut&lt;/title&gt;`;
    expect(escapeXml(input)).toBe(expected);
  });
});
