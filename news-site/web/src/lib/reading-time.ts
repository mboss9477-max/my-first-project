import type { PortableTextBlock } from "@portabletext/react";

/** Average adult reading speed for news prose. */
const WORDS_PER_MINUTE = 220;

type BlockChild = { text?: string };

/** Plain-text word count across Portable Text blocks, ignoring images. */
function countWords(blocks: PortableTextBlock[]) {
  let words = 0;

  for (const block of blocks) {
    if (block._type !== "block") continue;

    const children = (block.children ?? []) as BlockChild[];
    for (const child of children) {
      if (!child.text) continue;
      const trimmed = child.text.trim();
      if (trimmed) words += trimmed.split(/\s+/).length;
    }
  }

  return words;
}

export function readingTime(blocks: PortableTextBlock[] | null) {
  if (!blocks?.length) return null;

  const words = countWords(blocks);
  if (words === 0) return null;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
