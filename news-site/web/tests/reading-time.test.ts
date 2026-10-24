import { describe, it, expect } from "vitest";
import { readingTime } from "../src/lib/reading-time";
import type { PortableTextBlock } from "@portabletext/react";

describe("readingTime", () => {
  it("returns null for null, empty or missing blocks", () => {
    expect(readingTime(null)).toBeNull();
    expect(readingTime([])).toBeNull();
  });

  it("returns null when blocks contain zero words", () => {
    const emptyBlock: PortableTextBlock = {
      _key: "k1",
      _type: "block",
      children: [{ _key: "c1", _type: "span", text: "" }],
    };
    expect(readingTime([emptyBlock])).toBeNull();

    const whitespaceBlock: PortableTextBlock = {
      _key: "k2",
      _type: "block",
      children: [{ _key: "c2", _type: "span", text: "   \n  \t " }],
    };
    expect(readingTime([whitespaceBlock])).toBeNull();
  });

  it("ignores non-block types such as images", () => {
    const imageBlock: PortableTextBlock = {
      _key: "k3",
      _type: "image",
      children: [],
    };
    expect(readingTime([imageBlock])).toBeNull();
  });

  it("returns at least 1 minute for short word counts", () => {
    const words = Array(50).fill("news").join(" ");
    const block: PortableTextBlock = {
      _key: "k4",
      _type: "block",
      children: [{ _key: "c3", _type: "span", text: words }],
    };
    expect(readingTime([block])).toBe(1);
  });

  it("calculates reading time at 220 words per minute", () => {
    const words220 = Array(220).fill("word").join(" ");
    const block220: PortableTextBlock = {
      _key: "k5",
      _type: "block",
      children: [{ _key: "c4", _type: "span", text: words220 }],
    };
    expect(readingTime([block220])).toBe(1);

    const words440 = Array(440).fill("word").join(" ");
    const block440: PortableTextBlock = {
      _key: "k6",
      _type: "block",
      children: [{ _key: "c5", _type: "span", text: words440 }],
    };
    expect(readingTime([block440])).toBe(2);

    const words330 = Array(330).fill("word").join(" ");
    const block330: PortableTextBlock = {
      _key: "k7",
      _type: "block",
      children: [{ _key: "c6", _type: "span", text: words330 }],
    };
    expect(readingTime([block330])).toBe(2);
  });

  it("accumulates words across multiple blocks and children", () => {
    const blocks: PortableTextBlock[] = [
      {
        _key: "b1",
        _type: "block",
        children: [
          { _key: "c1", _type: "span", text: "Hello world" },
          { _key: "c2", _type: "span", text: "this is a test" },
        ],
      },
      {
        _key: "b2",
        _type: "image",
        children: [],
      },
      {
        _key: "b3",
        _type: "block",
        children: [
          { _key: "c3", _type: "span", text: "with four more words" },
        ],
      },
    ];
    // 2 + 4 + 4 = 10 words -> 1 minute
    expect(readingTime(blocks)).toBe(1);
  });
});
