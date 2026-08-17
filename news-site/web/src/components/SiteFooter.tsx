import {
  Camera,
  Globe,
  Headphones,
  Image as ImageIcon,
  Mail,
  Rss,
  Send,
  Video,
  type LucideIcon,
} from "lucide-react";

import { SITE_NAME } from "@/lib/site";

const TEXT_COLUMNS = [
  {
    title: "Latest",
    items: ["Home", "Authors", "Topic sitemap", "Archive", "Corrections"],
  },
  {
    title: "Browse",
    items: [
      "World",
      "Politics",
      "Tech",
      "Business",
      "Culture",
      "Sport",
      "Investigations",
    ],
  },
];

const MEDIA_ITEMS: { label: string; Icon: LucideIcon }[] = [
  { label: "Videos", Icon: Video },
  { label: "Pictures", Icon: Camera },
  { label: "Graphics", Icon: ImageIcon },
  { label: "Podcasts", Icon: Headphones },
];

const ABOUT_ITEMS = [
  "About us",
  "Editorial guidelines",
  "Privacy policy",
  "Contact",
  "Careers",
  "Advertise with us",
];

const STAY_INFORMED_ITEMS = ["Newsletters", "Subscribe", "Apps"];

/**
 * Generic glyphs rather than brand logos: lucide v1 removed its brand icon set,
 * and inventing lookalike marks would be worse than an honest generic icon.
 */
const SOCIAL_BUTTONS: { label: string; Icon: LucideIcon }[] = [
  { label: "Newsletter", Icon: Mail },
  { label: "RSS feed", Icon: Rss },
  { label: "Share", Icon: Send },
  { label: "Website", Icon: Globe },
];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm text-ink-soft">{children}</h2>;
}

function PlainItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="cursor-default text-sm font-medium text-ink transition-colors hover:text-accent">
      {children}
    </li>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Four columns of plain text links — no dividers between them. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {TEXT_COLUMNS.map((column) => (
            <div key={column.title}>
              <ColumnHeading>{column.title}</ColumnHeading>
              <ul className="mt-4 flex flex-col gap-3">
                {column.items.map((item) => (
                  <PlainItem key={item}>{item}</PlainItem>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <ColumnHeading>Media</ColumnHeading>
            <ul className="mt-4 flex flex-col gap-3">
              {MEDIA_ITEMS.map(({ label, Icon }) => (
                <li
                  key={label}
                  className="flex cursor-default items-center gap-2.5 text-sm font-medium text-ink transition-colors hover:text-accent"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>About {SITE_NAME}</ColumnHeading>
            <ul className="mt-4 flex flex-col gap-3">
              {ABOUT_ITEMS.map((item) => (
                <PlainItem key={item}>{item}</PlainItem>
              ))}
            </ul>

            <div className="mt-8">
              <ColumnHeading>Stay informed</ColumnHeading>
              <ul className="mt-4 flex flex-col gap-3">
                {STAY_INFORMED_ITEMS.map((item) => (
                  <PlainItem key={item}>{item}</PlainItem>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Trust row below the divider. */}
        <div className="mt-12 grid gap-10 border-t border-rule pt-10 md:grid-cols-[1fr_auto] md:gap-16">
          <div>
            <h2 className="text-base text-ink">Information you can trust</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
              {SITE_NAME} is an independent newsroom covering world affairs,
              politics, technology and business. We publish original reporting
              and analysis, and we correct our mistakes in public. Our newsroom
              is funded by readers, not advertisers.
            </p>
          </div>

          <div>
            <h2 className="text-base text-ink">Follow us</h2>
            <div className="mt-3 flex gap-2">
              {SOCIAL_BUTTONS.map(({ label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={`${label} (not yet available)`}
                  className="grid size-10 cursor-not-allowed place-items-center rounded border border-rule text-ink-soft transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-ink-soft">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
