import { Search } from "lucide-react";

/**
 * A plain GET form: it works without JavaScript, the query lands in the URL so
 * results are shareable and bookmarkable, and the back button behaves.
 */
export function SearchForm({
  defaultValue = "",
  autoFocus = false,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form action="/search" role="search" className="mt-4 flex gap-2">
      <label htmlFor="site-search" className="sr-only">
        Search stories
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
        />
        <input
          id="site-search"
          type="search"
          name="q"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Search stories"
          className="w-full rounded-sm border border-rule bg-surface py-2 pr-3 pl-9 text-sm transition-colors duration-150 ease-out placeholder:text-ink-soft focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-sm border border-rule px-4 text-sm font-medium transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
      >
        Search
      </button>
    </form>
  );
}
