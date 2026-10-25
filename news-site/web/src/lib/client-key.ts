/**
 * Who is asking, for rate limiting only. Never stored or logged.
 *
 * A visitor controls the headers they send, so which one we believe matters:
 * - `cf-connecting-ip` is set by Cloudflare, which overwrites any value the
 *   visitor sent, so it is trusted first. It is only trustworthy while all
 *   traffic comes through Cloudflare; a visitor who reaches the server directly
 *   could forge it. Restricting the server's ports 80 and 443 to Cloudflare's
 *   addresses closes that gap (a server step, not done yet).
 * - Otherwise the LAST `x-forwarded-for` entry: each proxy appends the address
 *   it saw to the end, so the last entry comes from our own proxy and the
 *   first (which the visitor can write) is ignored.
 * - Otherwise `x-real-ip`, then the shared "unknown" bucket.
 * Anything that does not look like an IP address is ignored, so a visitor cannot
 * fill the limiter with junk keys.
 */
const IP_LIKE = /^[0-9a-fA-F:.]{3,45}$/;

type HeaderReader = { get(name: string): string | null };

function ipOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && IP_LIKE.test(trimmed) ? trimmed : null;
}

export function clientKey(headers: HeaderReader): string {
  const cloudflare = ipOrNull(headers.get("cf-connecting-ip"));
  if (cloudflare) return cloudflare;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const last = ipOrNull(forwarded.split(",").pop());
    if (last) return last;
  }

  return ipOrNull(headers.get("x-real-ip")) ?? "unknown";
}
