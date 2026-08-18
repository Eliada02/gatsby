# Content

This directory is the content source for NovaHealth. It stands in for a headless
CMS (Contentful, Sanity, Storyblok) without requiring one to run the project.

## Why JSON files

The brief called for a content-driven architecture that could adopt a real CMS
later. Structuring the content as JSON that matches a CMS response shape gives
that property without the cost of running a CMS for a demo: no API keys, no
network dependency in CI, and the content is reviewable in a pull request.

## Shape

Every file is an array of entries matching a type in
[`src/types/content.ts`](../src/types/content.ts):

| File              | Type                | Used by                           |
| ----------------- | ------------------- | --------------------------------- |
| `resources.json`  | `Resource[]`        | Resources library, resource pages |
| `treatments.json` | `Treatment[]`       | Treatments page                   |
| `research.json`   | `ResearchProgram[]` | Our Science page                  |
| `authors.json`    | `Author[]`          | Resource attribution              |

The model follows CMS conventions rather than component convenience:

- relations are stored as ids (`authorIds`), not embedded objects
- dates are ISO 8601 strings, not `Date` instances
- media is an object with required `alt`, not a bare URL string

## How content is consumed

Nothing imports these files directly except
[`src/lib/content/source.ts`](../src/lib/content/source.ts), which is the single
boundary where content enters the application:

```
content/*.json
      ↓
src/lib/content/source.ts        ← swap this one module for a CMS client
      ↓
  ┌───┴────────────────────┐
REST handlers          build-time page generation
(src/api)              (gatsby-node.ts)
      ↓                      ↓
  UI components (never read content directly)
```

## Adding or editing content

1. Edit the relevant JSON file.
2. Run `npm test` — `src/lib/content/source.test.ts` validates the collections.

Those tests check what a CMS would normally enforce on publish: unique slugs,
known category values, parseable dates, author references that resolve, and
non-empty alt text on images. A content error fails CI rather than reaching a
built page.
