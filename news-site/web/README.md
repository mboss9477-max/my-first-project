# CS NEWS — web

The Next.js 16 App Router front end. See the [repository README](../../README.md)
for the full picture, seeding, and environment variables.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build; also typechecks
npm run lint
```

## Layout

```
src/
├── app/          # routes; every page is a server component
├── components/   # shared UI ("use client" only where it must be)
└── sanity/       # client, image builder, GROQ queries and their types
└── lib/          # framework-free helpers: dates, reading time, XML, site config
```

## Conventions worth knowing

**Queries live in one place.** Every GROQ query and its TypeScript type is in
`src/sanity/queries.ts`, sharing one `ARTICLE_CARD_FIELDS` projection so every
list of articles has an identical shape.

**Client components are the exception.** Only `CategoryNav`, `Reveal` and
`ThemeToggle` are client components. Hover and colour transitions are plain CSS
precisely so cards can stay server-rendered.

**Motion is CSS first.** `motion` is used only for the sliding nav underline
(`layoutId`) and scroll reveals (`whileInView`). Durations and easing come from
`--motion-*` tokens in `globals.css`, and a global `prefers-reduced-motion`
guard covers Tailwind's own transition utilities too.

**Placeholder content.** `src/lib/placeholder-articles.ts` renders only while
the Sanity dataset is empty. Delete it, its fallback in `app/page.tsx`, and the
`picsum.photos` entry in `next.config.ts` once there is real content.

**Links without destinations are not links.** Anything with no route yet renders
as text or a `disabled` button rather than `href="#"` — a dead anchor is
focusable and announced as a link, which is worse than plain text.
