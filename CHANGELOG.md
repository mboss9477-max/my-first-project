# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Homepage redesign for CS NEWS, plus code-quality fixes carried over from an
audit of the initial Sanity + Next.js foundation.

### Added

- **Gold/ash visual identity.** Antique gold accent on warm-grey (ash) grounds,
  defined as CSS custom properties in `globals.css` and exposed to Tailwind via
  `@theme`. Full light and dark palettes.
- **Playfair Display** for the masthead and all headlines, paired with Geist Sans
  for UI and metadata text. Self-hosted at build time through `next/font`.
- **3-tier header** (`src/components/SiteHeader.tsx`):
  - Slim dark utility bar with monogram, `EN` language placeholder, and
    edition/login placeholders.
  - Near-white masthead with the current date and a large centred serif wordmark.
  - Centred section nav with the active section underlined in gold, followed by a
    text-only Trending strip.
  - The utility and masthead bands use tokens that deliberately do **not** invert
    with the colour scheme, so the masthead stays the one lighter section in both
    light and dark mode.
- **Bordered "caged" content grid** on the homepage — asymmetric clusters, each
  with its own border, with negative margins collapsing shared edges into single
  hairlines:
  - Lead card (image left, headline and gold sub-links right) above a strip with
    carousel controls, beside a narrow "More top stories" column.
  - Feature image card beside a thumbnail "Briefing" list.
- **Multi-column trust footer** (`src/components/SiteFooter.tsx`) — four plain-text
  columns (Latest, Browse, Media, About) plus a divider row carrying a "who we
  are" blurb and social buttons in bordered squares.
- **`lucide-react`** for iconography, replacing hand-written SVG path data.
- **Placeholder article set** (`src/lib/placeholder-articles.ts`) with seeded
  `picsum.photos` images, rendered only while the Sanity dataset is empty so the
  layout is reviewable before any content is published. Real content replaces it
  automatically on first publish.
- **`src/lib/site.ts`** holding the site name, tagline, and nav categories in one
  place.

### Changed

- Site branding set to **CS NEWS** throughout (header, footer, page metadata),
  sourced from a single `SITE_NAME` constant.
- Article page restyled onto the shared palette tokens so it no longer clashes
  with the site chrome it now sits inside.
- Project ID reduced to **one constant per package** (`web/src/sanity/env.ts` and
  `studio/env.ts`), down from three locations. `.env.local` removed; the redundant
  env-var indirection went with it.
- `formatDate` extracted to `src/lib/format.ts`, having been duplicated verbatim
  across both pages.
- Category options in the Article schema simplified to a plain string list, and
  three exports that were only used within their own module made local.

### Fixed

- **Hero and inline images no longer assume a 3:2 ratio.** Dimensions now come
  from the Sanity asset's real metadata and account for any crop set in the
  Studio, eliminating layout shift on non-3:2 images.
- **Removed the `figcaption` that echoed hero alt text**, which caused screen
  readers to announce the same string twice — once as the image description and
  again as a caption.
- Portable Text now styles `h1` and `h4`; previously only `h2`/`h3` were covered,
  so those headings rendered unstyled.
- Homepage empty state no longer hardcodes a `localhost:3333` link, which would
  have shipped as a broken link in production.
- Corrected the Sanity project ID from `crjl8h2y` to `crji8h2y`; the former does
  not exist and every request against it returned 404.

### Notes

- Placeholder links (nav items, footer items, social buttons) render as text or
  `disabled` buttons rather than `<a href="#">`, since a dead anchor is focusable
  and announced as a link. They become real links once routing exists.
- The gold nav underline is hardcoded to "World" — there is no section routing yet.
- Social buttons use generic glyphs, not brand logos: lucide v1 removed its brand
  icon set, and inventing lookalike marks would be worse than an honest generic
  icon.
- Multilingual support (Mandarin, Spanish, Arabic RTL) remains out of scope.
