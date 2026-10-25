import type { PortableTextBlock } from "@portabletext/react";
import type { ArticleBodyData, LexicalNode } from "@/data";

/** Average adult reading speed for news prose. */
const WORDS_PER_MINUTE = 220;

type BlockChild = { text?: string };

function wordsIn(text: string | undefined) {
  const trimmed = text?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Plain-text word count across Portable Text blocks, ignoring images. */
function countPortableTextWords(
  blocks: Extract<ArticleBodyData, { format: "portableText" }>["blocks"],
) {
  let words = 0;

  for (const block of blocks) {
    if (block._type !== "block") continue;

    const children = (block.children ?? []) as BlockChild[];
    for (const child of children) words += wordsIn(child.text);
  }

  return words;
}

/** Word count across a Lexical tree's text nodes; images have no text. */
function countLexicalWords(node: LexicalNode): number {
  let words = node.type === "text" ? wordsIn(node.text) : 0;
  for (const child of node.children ?? []) words += countLexicalWords(child);
  return words;
}

/** True when the body has at least one block to render. */
export function hasBodyContent(body: ArticleBodyData | null) {
  if (!body) return false;
  return body.format === "portableText"
    ? body.blocks.length > 0
    : (body.root.children?.length ?? 0) > 0;
}

/** Accepts a body in either format, or bare Portable Text blocks. */
export function readingTime(
  input: ArticleBodyData | PortableTextBlock[] | null,
) {
  const body: ArticleBodyData | null = Array.isArray(input)
    ? { format: "portableText", blocks: input }
    : input;
  if (!hasBodyContent(body) || !body) return null;

  const words =
    body.format === "portableText"
      ? countPortableTextWords(body.blocks)
      : countLexicalWords(body.root);
  if (words === 0) return null;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
