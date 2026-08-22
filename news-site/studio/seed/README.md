# Seed data

## Categories

`categories.ndjson` contains the six launch categories as `category` documents.

Import them into the dataset (run from `news-site/studio`):

```bash
npx sanity dataset import seed/categories.ndjson production
```

The Sanity CLI needs its own login, separate from signing into the Studio in a
browser. If the command asks you to authenticate, run `npx sanity login` first.

Re-running the import is safe: the documents use fixed IDs (`category-world` and
so on), so a second run replaces them rather than creating duplicates. Add
`--replace` if the CLI reports an ID conflict.

## Why the IDs contain no dots

Sanity treats `.` in a document ID as a path separator, and this dataset's
public read grant is `_id in path("*")` — one segment only. An ID like
`category.politics` is two segments, so it falls outside the grant: the
document exists, the Studio shows it (the Studio reads with credentials), but
the public API omits it with `reason: "permission"` and any `category->name`
dereference silently resolves to null on the site.

Keep seeded IDs single-segment (`category-politics`, not `category.politics`).

Alternatively, create the six documents by hand in the Studio under **Category**
— the import is just faster.

## Note on migrating articles

`article.category` changed from a plain string to a reference. No article
migration was needed because the dataset had no published articles at the time
of the change. If articles with string categories ever appear (for example from
a restored backup), they will need their `category` field rewritten to a
reference before they render a category name.
