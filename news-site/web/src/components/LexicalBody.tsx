import Image from "next/image";
import type { ReactNode } from "react";

import type { LexicalNode } from "@/data";
import { displayDimensions, imageUrl } from "@/data/image";

/**
 * Renders an article body saved by the new CMS (Lexical editor state). The
 * look matches the Portable Text renderer in `ArticleBody`. Only the node
 * types the CMS editor can produce are handled; anything else is skipped, so
 * an unknown block never breaks a page.
 */

// Lexical's text format bit flags.
const BOLD = 1;
const ITALIC = 2;
const STRIKE = 4;
const UNDERLINE = 8;
const CODE = 16;

const LINK_CLASS =
  "underline decoration-rule underline-offset-2 transition-colors duration-150 ease-out hover:decoration-accent hover:text-accent";

/** Only web and mail links are rendered as links; anything else is plain text. */
function safeHref(value: unknown) {
  if (typeof value !== "string") return null;
  return /^(https?:|mailto:|\/)/i.test(value) ? value : null;
}

function renderText(node: LexicalNode, key: number): ReactNode {
  const format = typeof node.format === "number" ? node.format : 0;
  let out: ReactNode = node.text ?? "";
  if (format & CODE) out = <code key={`c${key}`}>{out}</code>;
  if (format & BOLD) out = <strong key={`b${key}`}>{out}</strong>;
  if (format & ITALIC) out = <em key={`i${key}`}>{out}</em>;
  if (format & UNDERLINE) out = <u key={`u${key}`}>{out}</u>;
  if (format & STRIKE) out = <s key={`s${key}`}>{out}</s>;
  return out;
}

function renderChildren(nodes: LexicalNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, i));
}

function UploadFigure({ node }: { node: LexicalNode }) {
  const image = node.image;
  if (!image) return null;
  const size = displayDimensions(image, 1600) ?? { width: 1600, height: 900 };

  return (
    <figure className="my-8">
      <Image
        src={imageUrl(image, { width: size.width })}
        alt={image.alt ?? ""}
        width={size.width}
        height={size.height}
        sizes="(max-width: 672px) 100vw, 672px"
        className="h-auto w-full rounded"
      />
      {image.caption ? (
        <figcaption className="mt-2 text-sm text-ink-soft">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderNode(node: LexicalNode, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "linebreak":
      return <br key={key} />;
    case "link": {
      const href = safeHref(node.fields?.url);
      const inner = renderChildren(node.children);
      if (!href) return <span key={key}>{inner}</span>;
      return (
        <a key={key} href={href} rel="noreferrer noopener" className={LINK_CLASS}>
          {inner}
        </a>
      );
    }
    case "paragraph":
      return (
        <p key={key} className="my-5 leading-8">
          {renderChildren(node.children)}
        </p>
      );
    case "heading": {
      const children = renderChildren(node.children);
      switch (node.tag) {
        case "h1":
          return <h1 key={key} className="mt-10 mb-3 text-3xl font-bold">{children}</h1>;
        case "h2":
          return <h2 key={key} className="mt-10 mb-3 text-2xl font-semibold">{children}</h2>;
        case "h3":
          return <h3 key={key} className="mt-8 mb-3 text-xl font-semibold">{children}</h3>;
        case "h4":
          return <h4 key={key} className="mt-6 mb-2 text-lg font-semibold">{children}</h4>;
        case "h5":
          return <h5 key={key} className="mt-6 mb-2 text-base font-semibold">{children}</h5>;
        default:
          return <h6 key={key} className="label mt-6 mb-2 text-ink-soft">{children}</h6>;
      }
    }
    case "quote":
      return (
        <blockquote key={key} className="my-6 border-l-4 border-rule pl-4 italic">
          {renderChildren(node.children)}
        </blockquote>
      );
    case "list":
      return node.listType === "number" ? (
        <ol key={key} className="my-5 list-decimal space-y-2 pl-6">
          {renderChildren(node.children)}
        </ol>
      ) : (
        <ul key={key} className="my-5 list-disc space-y-2 pl-6">
          {renderChildren(node.children)}
        </ul>
      );
    case "listitem":
      return <li key={key}>{renderChildren(node.children)}</li>;
    case "upload":
      return <UploadFigure key={key} node={node} />;
    default:
      return null;
  }
}

export function LexicalBody({ root }: { root: LexicalNode }) {
  return <>{renderChildren(root.children)}</>;
}
