import Image from "next/image";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";

import {
  displayDimensions,
  urlForImage,
  type ImageDimensions,
} from "@/sanity/image";

type InlineImage = SanityImageSource & {
  alt?: string | null;
  caption?: string | null;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  dimensions?: ImageDimensions | null;
};

function InlineImageView({ value }: { value: InlineImage }) {
  const size = displayDimensions(value, 1600) ?? { width: 1600, height: 900 };

  return (
    <figure className="my-8">
      <Image
        src={urlForImage(value).width(size.width).url()}
        alt={value.alt ?? ""}
        width={size.width}
        height={size.height}
        sizes="(max-width: 672px) 100vw, 672px"
        className="h-auto w-full rounded"
      />
      {value.caption ? (
        <figcaption className="mt-2 text-sm text-ink-soft">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const components: PortableTextComponents = {
  types: {
    image: ({ value }: { value: InlineImage }) => (
      <InlineImageView value={value} />
    ),
  },
  block: {
    normal: ({ children }) => <p className="my-5 leading-8">{children}</p>,
    h1: ({ children }) => (
      <h1 className="mt-10 mb-3 text-3xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 text-2xl font-semibold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 text-xl font-semibold">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 text-lg font-semibold">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="mt-6 mb-2 text-base font-semibold">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="label mt-6 mb-2 text-ink-soft">{children}</h6>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-rule pl-4 italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-5 list-disc space-y-2 pl-6">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="my-5 list-decimal space-y-2 pl-6">{children}</ol>
    ),
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        rel="noreferrer noopener"
        className="underline underline-offset-2"
      >
        {children}
      </a>
    ),
  },
};

export function ArticleBody({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />;
}
