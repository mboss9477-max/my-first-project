# Known issues and future work

Deliberately deferred items. Each one names what is missing and what it would
take, so it can be picked up without re-deriving the context.

## Navigation

- **Real Trending links (needs tags field + `/topic` route).** The Trending strip
  in the header renders topic phrases as plain text, not links. They are topics
  rather than categories, so the existing `/category/[slug]` pages do not cover
  them. Making them real needs a `tags` array field on the Article schema, a
  `/topic/[tag]` route (or a search route) listing articles by tag, and a way to
  decide what is trending — either curated in the Studio or derived from
  analytics. Until then they stay inert, per the rule that placeholder links stay
  non-functional rather than becoming dead `href="#"` anchors.
