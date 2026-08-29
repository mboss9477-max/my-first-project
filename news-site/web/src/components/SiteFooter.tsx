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
import Link from "next/link";

import { NewsletterSignup } from "@/components/NewsletterSignup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import { ALL_CATEGORIES_QUERY, type Category } from "@/sanity/queries";

/** Real destinations. */
const LATEST_LINKS = [
  { label: "Home", href: "/" },
  { label: "Search", href: "/search" },
  { label: "RSS feed", href: "/feed.xml" },
];

/** No destinations yet, so these stay as plain text. */
const LATEST_TEXT = ["Authors", "Archive", "Corrections"];

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
const SOCIAL_BUTTONS: { label: string; Icon: LucideIcon; href?: string }[] = [
  { label: "Newsletter", Icon: Mail },
  { label: "RSS feed", Icon: Rss, href: "/feed.xml" },
  { label: "Share", Icon: Send },
  { label: "Website", Icon: Globe },
];

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm text-ink-soft">{children}</h2>;
}

function PlainItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="cursor-default text-sm font-medium text-ink">{children}</li>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm font-medium text-ink transition-colors duration-150 ease-out hover:text-accent"
      >
        {children}
      </Link>
    </li>
  );
}

export async function SiteFooter() {
  const categories = await client.fetch<Category[]>(ALL_CATEGORIES_QUERY);

  return (
    <footer className="mt-16">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <NewsletterSignup />

        {/* Four columns of plain text links — no dividers between them. */}
        <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          <div>
            <ColumnHeading>Latest</ColumnHeading>
            <ul className="mt-4 flex flex-col gap-3">
              {LATEST_LINKS.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
              {LATEST_TEXT.map((item) => (
                <PlainItem key={item}>{item}</PlainItem>
              ))}
            </ul>
          </div>

          {/* Browse — real destinations now that category pages exist. */}
          <div>
            <ColumnHeading>Browse</ColumnHeading>
            <ul className="mt-4 flex flex-col gap-3">
              {categories.map((category) => (
                <FooterLink
                  key={category._id}
                  href={`/category/${category.slug}`}
                >
                  {category.name}
                </FooterLink>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Media</ColumnHeading>
            <ul className="mt-4 flex flex-col gap-3">
              {MEDIA_ITEMS.map(({ label, Icon }) => (
                <li
                  key={label}
                  className="flex cursor-default items-center gap-2.5 text-sm font-medium text-ink"
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
              {SOCIAL_BUTTONS.map(({ label, Icon, href }) =>
                href ? (
                  <Link
                    key={label}
                    href={href}
                    aria-label={label}
                    className="grid size-10 place-items-center rounded border border-rule text-ink-soft transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </Link>
                ) : (
                  <button
                    key={label}
                    type="button"
                    disabled
                    aria-label={`${label} (not yet available)`}
                    className="grid size-10 cursor-not-allowed place-items-center rounded border border-rule text-ink-soft transition-colors duration-150 ease-out"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-ink-soft">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
