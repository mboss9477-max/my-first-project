import Image from "next/image";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";

import { urlForImage, type SanityImageSource } from "@/sanity/image";

type InlineImage = SanityImageSource & {
  alt?: string | null;
  caption?: string | null;
};

const components: PortableTextComponents = {
  types: {
    image: ({ value }: { value: InlineImage }) => (
      <figure className="my-8">
        <Image
          src={urlForImage(value).width(1600).url()}
          alt={value.alt ?? ""}
          width={800}
          height={533}
          className="h-auto w-full rounded"
        />
        {value.caption ? (
          <figcaption className="mt-2 text-sm text-black/60 dark:text-white/60">
            {value.caption}
          </figcaption>
        ) : null}
      </figure>
    ),
  },
  block: {
    normal: ({ children }) => <p className="my-5 leading-8">{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 text-2xl font-semibold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 text-xl font-semibold">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-black/20 pl-4 italic dark:border-white/25">
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
