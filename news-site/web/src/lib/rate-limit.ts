/**
 * A small in-memory limiter: at most `max` attempts per key within `windowMs`.
 * Per server instance (it is not shared between instances), which is enough as
 * a first line of defence for one small server. Keys are held in memory only
 * and never logged or stored.
 *
 * Known limit (Gemini's finding ADV2-5): when more than `maxKeys` visitors are
 * active at once, the oldest are forgotten and their allowance resets. Dropping
 * expired entries first would change nothing here, because the visitor with the
 * oldest activity is always the first to expire. What actually stops an attacker
 * from flooding the map is that keys cannot be invented: see `client-key.ts`.
 */
export function createRateLimiter(options: {
  windowMs: number;
  /** Most distinct keys remembered at once; the oldest are dropped first. */
  maxKeys?: number;
  now?: () => number;
}) {
  const { windowMs, maxKeys = 5_000, now = Date.now } = options;
  const attempts = new Map<string, number[]>();

  return {
    /** Records an attempt and says whether it is allowed. */
    allow(key: string, max: number) {
      const time = now();
      const recent = (attempts.get(key) ?? []).filter((t) => time - t < windowMs);
      if (recent.length >= max) {
        attempts.set(key, recent);
        return false;
      }
      recent.push(time);
      // Re-insert so the Map's order stays oldest-first.
      attempts.delete(key);
      attempts.set(key, recent);
      while (attempts.size > maxKeys) {
        const oldest = attempts.keys().next().value;
        if (oldest === undefined) break;
        attempts.delete(oldest);
      }
      return true;
    },
    /** For tests. */
    reset() {
      attempts.clear();
    },
  };
}
