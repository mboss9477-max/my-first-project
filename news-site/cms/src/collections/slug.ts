/** Lowercase words joined by single hyphens, e.g. "council-approves-cycle-lanes". */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const MAX_LENGTH = 96

/** "Café owners’ 2026 plan: what’s next?" -> "cafe-owners-2026-plan-whats-next" */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’]/g, '') // "what's" -> "whats", not "what-s"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '')
}
