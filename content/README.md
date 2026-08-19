# Content

This directory is the content source for NovaHealth. It stands in for a headless
CMS (Contentful, Sanity, Storyblok) without requiring one to run the project.

## Why JSON files

The brief called for a content-driven architecture that could adopt a real CMS
later. Structuring the content as JSON that matches a CMS response shape gives
that property without the cost of running a CMS for a demo: no API keys, no
network dependency in CI, and the content is reviewable in a pull request.

## Shape

Every file matches a type, and every file is read by at least one page or
endpoint:

| File                      | Type                   | Used by                                 |
| ------------------------- | ---------------------- | --------------------------------------- |
| `resources.json`          | `Resource[]`           | Resource library, resource detail pages |
| `authors.json`            | `Author[]`             | Resource attribution, Article JSON-LD   |
| `home.json`               | `HomeContent`          | Home page bands                         |
| `journey.json`            | `JourneyStage[]`       | Home: connected care journey            |
| `capabilities.json`       | `PlatformCapability[]` | Home: platform overview                 |
| `security-practices.json` | `SecurityPractice[]`   | Home preview and the Security page      |
| `security.json`           | `SecurityPageContent`  | Security & Trust page                   |
| `about.json`              | `AboutPageContent`     | About & Contact page                    |

Types live in [`src/types/content.ts`](../src/types/content.ts) for the editorial
catalogue and [`src/types/site.ts`](../src/types/site.ts) for page copy. The
split mirrors a CMS, where catalogue entries and marketing copy are different
content types owned by different people.

`treatments.json` and `research.json` were removed in the final phase. They
modelled a pharmaceutical pipeline for pages that were never built — the site
became a digital health platform instead — and nothing rendered them.

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
