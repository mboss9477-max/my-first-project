import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleRow } from "@/components/ArticleRow";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import {
  TOPIC_QUERY,
  TOPIC_SLUGS_QUERY,
  type TopicWithArticles,
} from "@/sanity/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(TOPIC_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

function getTopic(slug: string) {
  return client.fetch<TopicWithArticles | null>(TOPIC_QUERY, { slug });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopic(slug);

  if (!topic) return { title: "Topic not found" };

  const description = `Coverage of ${topic.name} from ${SITE_NAME}.`;

  return {
    title: topic.name,
    description,
    alternates: { canonical: `/topic/${topic.slug}` },
    openGraph: {
      type: "website",
      title: `${topic.name} | ${SITE_NAME}`,
      description,
      url: `/topic/${topic.slug}`,
      siteName: SITE_NAME,
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopic(slug);

  if (!topic) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumbs trail={[{ name: topic.name, href: `/topic/${topic.slug}` }]} />

      <header className="mt-6 border-b border-rule pb-6">
        <p className="label text-accent">Topic</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          {topic.name}
        </h1>
      </header>

      {topic.articles.length > 0 ? (
        <ul className="fade-in mt-2 divide-y divide-rule">
          {topic.articles.map((article, index) => (
            <ArticleRow key={article._id} article={article} index={index} />
          ))}
        </ul>
      ) : (
        <p className="fade-in mt-8 text-ink-soft">
          Nothing filed under {topic.name} yet.
        </p>
      )}
    </main>
  );
}
