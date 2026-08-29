import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-6 py-24">
      <span className="label text-accent">404</span>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-prose text-ink-soft">
        The story you&rsquo;re looking for may have moved, been renamed, or
        never existed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-sm border border-rule px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
      >
        ← Back to the front page
      </Link>
    </main>
  );
}
