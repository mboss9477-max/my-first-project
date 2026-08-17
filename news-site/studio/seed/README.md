# Seed data

## Categories

`categories.ndjson` contains the six launch categories as `category` documents.

Import them into the dataset (run from `news-site/studio`):

```bash
npx sanity dataset import seed/categories.ndjson production
```

The Sanity CLI needs its own login, separate from signing into the Studio in a
browser. If the command asks you to authenticate, run `npx sanity login` first.

Re-running the import is safe: the documents use fixed IDs (`category.world` and
so on), so a second run replaces them rather than creating duplicates. Add
`--replace` if the CLI reports an ID conflict.

Alternatively, create the six documents by hand in the Studio under **Category**
— the import is just faster.

## Note on migrating articles

`article.category` changed from a plain string to a reference. No article
migration was needed because the dataset had no published articles at the time
of the change. If articles with string categories ever appear (for example from
a restored backup), they will need their `category` field rewritten to a
reference before they render a category name.
