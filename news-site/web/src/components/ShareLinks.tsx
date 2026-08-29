import { Link2, Mail } from "lucide-react";

import { SITE_URL } from "@/lib/site";

/**
 * Share links as plain anchors — no third-party share SDKs, so nothing tracks
 * the reader before they choose to share. `CopyLink` is the only interactive
 * piece and it degrades to a visible URL if JavaScript is off.
 */
export function ShareLinks({
  headline,
  slug,
}: {
  headline: string;
  slug: string;
}) {
  const url = `${SITE_URL}/article/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(headline);

  const targets = [
    {
      label: "Share by email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      Icon: Mail,
    },
    {
      label: "Open link",
      href: url,
      Icon: Link2,
    },
  ];

  return (
    <div className="mt-8 flex items-center gap-3 border-t border-rule pt-6">
      <span className="label text-ink-soft">Share</span>
      {targets.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          className="grid size-9 place-items-center rounded-sm border border-rule text-ink-soft transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
        >
          <Icon aria-hidden="true" className="size-4" />
        </a>
      ))}
    </div>
  );
}
