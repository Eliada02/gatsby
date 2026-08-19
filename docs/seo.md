# SEO

How NovaHealth is made discoverable: where metadata comes from, how URLs are
made absolute, what is submitted to crawlers, and what the structured data is
allowed to claim.

The rule underneath all of it: **metadata describes what is on the page**. A
fictional company can be indexed honestly, but it cannot be described as a real
healthcare provider — see [Content integrity](#content-integrity).

---

## Architecture

One component owns everything a page contributes to `<head>`:

```
gatsby-config.ts  siteMetadata (title, template, description, siteUrl, locale,
        │         organization, social image)
        │
src/hooks/useSiteMetadata.ts       static query, usable from a Head export
        │
src/components/seo/Seo.tsx         title · description · canonical · robots
        │                          Open Graph · Twitter · JSON-LD
        ├── src/lib/seo/urls.ts             absolute URL construction
        └── src/lib/seo/structured-data.ts  JSON-LD builders
```

Every page's `Head` renders exactly one `<Seo />`. Nothing else in the codebase
emits a meta tag, so there is no page that spells `og:type` differently or
forgets the canonical.

`pathname` is a **required** prop. A missing canonical is invisible — the page
renders correctly and the mistake surfaces months later as duplicate-content
warnings — so the type system asks for it at every call site. Head receives
`location`, so passing it costs one prop.

### Per-page metadata

| Route                  | Title                                               | Description                                                 | Type      |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------------- | --------- |
| `/`                    | Own full title, no template                         | Written for the page                                        | `website` |
| `/platform/`           | `Platform \| NovaHealth`                            | Written for the page                                        | `website` |
| `/patient-experience/` | `Patient Experience \| …`                           | Written for the page                                        | `website` |
| `/resources/`          | `Resources \| NovaHealth`                           | Written for the page                                        | `website` |
| `/security/`           | `Security & Trust \| …`                             | Written for the page                                        | `website` |
| `/about/`              | `About & Contact \| …`                              | Written for the page                                        | `website` |
| `/resources/<slug>/`   | Resource's own SEO title, falling back to its title | The resource's SEO description, falling back to its summary | `article` |
| `/404/`                | `Page not found \| …`                               | Written for the page                                        | `noindex` |

A test asserts that every route's title and description are distinct and that
none of them is the site-wide fallback: a page that never wrote its own
description is the usual way a small site starts looking auto-generated.

Resource pages derive everything from the resource as published — title,
description, dates, section, tags — so a new resource is fully described the
moment it is added to `content/resources.json`.

---

## Site metadata and the production URL

Defaults live in `gatsby-config.ts`:

| Field                  | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `title`                | `NovaHealth` — used as `og:site_name`                             |
| `titleTemplate`        | `%s \| NovaHealth`                                                |
| `description`          | Fallback description, used by any page that does not set its own  |
| `siteUrl`              | `SITE_URL` → `DEPLOY_PRIME_URL` → `URL` → `http://localhost:8000` |
| `locale`               | `en` — also drives `<html lang>` and `inLanguage`                 |
| `organization`         | Name, legal name and tagline, used by the Organization node       |
| `socialImage` / `…Alt` | `/og-image.png`, generated at build time                          |

**The production domain is not known to this repository, and none is invented.**
`SITE_URL` must be supplied by whoever deploys it. On Netlify nothing needs to
be set: `DEPLOY_PRIME_URL` and `URL` are read automatically, so preview deploys
emit their own canonical and Open Graph URLs instead of pointing at production.

When no origin is configured the build falls back to `http://localhost:8000`,
and `src/lib/seo/urls.ts` treats that as **no origin at all**:

- no `<link rel="canonical">`
- no `og:url`, no `og:image`, no `twitter:image`
- no `Sitemap:` line in `robots.txt`

Omitting them is deliberate. A canonical pointing at localhost tells a crawler
the authoritative copy of the page lives somewhere it cannot reach, which is
worse than saying nothing — and the omission is visible in the build output,
where a wrong URL would not be.

---

## Canonical URLs

- Exactly one `<link rel="canonical">` per indexable page, asserted in tests.
- Always absolute, built from `siteUrl` + the normalised pathname.
- `og:url` is the same string, so the two can never disagree.
- **Trailing slashes**: Gatsby's default `trailingSlash: 'always'` is in force,
  so `/about` and `/about/` are one page. Every path is normalised to the
  trailing-slash form, and `/` stays `/`.
- Query strings and fragments are stripped: `/resources/?search=audit` is the
  same document as `/resources/`, and the library's filters are URL state rather
  than separate pages.
- **The 404 has no canonical.** It is served for every URL that does not exist,
  so a self-referential canonical points either at the error page itself or, on
  a client-side miss, at the URL the reader mistyped. `noindex, follow` is what
  keeps it out of the index; a canonical would only add a wrong claim.

---

## Sitemap

Generated by `gatsby-plugin-sitemap` (the official plugin) from the pages Gatsby
actually built, so a new resource appears without anyone maintaining a list.

- Output: `/sitemap-index.xml` → `/sitemap-0.xml`, linked from `<head>`.
- Contents: the six public routes and every resource detail page — 20 URLs.
- Excluded: `/404`, `/404.html`, `/dev-404-page/`.
- API routes are Gatsby Functions rather than pages, so they never appear.
- URLs use `siteUrl`, so a preview deploy submits its own URLs, not production's.

---

## robots.txt

Written at the end of the build by `gatsby-node.ts` (`src/lib/seo/robots.ts`),
because the one line that matters — the absolute sitemap URL — depends on the
origin the build was given.

```
User-agent: *
Allow: /

Sitemap: <siteUrl>/sitemap-index.xml
```

What it deliberately does **not** do:

- **It does not block `/api/`.** The resource library fetches `/api/resources`
  from the browser, so a crawler rendering the page needs that request to
  succeed. Blocking it would degrade how the library is understood in order to
  prevent the indexing of a JSON document nobody searches for.
- **It does not block the 404.** `noindex` is the mechanism that keeps a page
  out of an index; a `Disallow` would only stop a crawler from reading it.
- **It is not a security control.** robots.txt is a request, not an
  authorisation boundary. Anything genuinely sensitive would need authorisation,
  and nothing here is.

---

## Open Graph and Twitter

Every page emits `og:type`, `og:site_name`, `og:title`, `og:description`,
`og:locale`, and — when an origin is configured — `og:url`, `og:image`,
`og:image:alt` and the image's dimensions. Resource pages add
`article:published_time`, `article:modified_time`, `article:section`,
`article:author` and one `article:tag` per tag.

Twitter reads the Open Graph tags for anything it does not define itself, so
only `twitter:card` (`summary_large_image`), `twitter:title`,
`twitter:description`, `twitter:image` and `twitter:image:alt` are repeated.

**There is no `twitter:site` or `twitter:creator`.** NovaHealth is fictional and
has no account; inventing a handle would credit somebody else's.

### The social card

One image for the whole site: `public/og-image.png`, 1200×630, ~34 kB,
generated during `onPostBuild` from the SVG in `src/lib/seo/og-image.ts` and
rasterised by the `sharp` the project already depends on.

Generated rather than committed so it cannot go stale when the wording changes,
and shared rather than per-page because a per-route card would mean one
rasterisation per page for a site whose pages differ by a heading. The card
carries the disclaimer — "A fictional demonstration project" — because a shared
card travels without the page it came from.

---

## Structured data

One JSON-LD document per page, a single `@graph`, built in
`src/lib/seo/structured-data.ts`:

| Node             | Where                | Contents                                                                                                             |
| ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Organization`   | Every indexable page | Name, legal name, URL, description, slogan, logo, and a `disambiguatingDescription` stating the company is fictional |
| `WebSite`        | Every indexable page | Name, URL, language, publisher reference, and a `SearchAction` pointing at `/resources/?search={search_term_string}` |
| `Article`        | Resource detail      | Headline, description, URL, dates, authors, publisher, section, keywords, word count, reading time                   |
| `BreadcrumbList` | Resource detail      | Resources → this resource, matching the trail the page displays                                                      |

The site graph travels with every indexable page so that the `publisher` and
`@id` references on an Article resolve inside the same document — a dangling
reference is what you get from emitting Organization on the home page only.

`noindex` pages emit **no** structured data: there is nothing there to describe
truthfully.

The `SearchAction` describes behaviour that exists — the library really does
read `?search=` from the URL. Validate any change to these builders with
Google's Rich Results Test or the Schema.org validator against a deployed URL;
the shapes are also asserted in `src/lib/seo/seo.test.ts`.

### Content integrity

Structured data is a set of claims made to a machine that a reader never sees,
which makes it the easiest place in a codebase to assert something untrue. The
following are deliberately absent, and a test fails if any of them appears:

- `aggregateRating`, `review`, `offers`, `priceRange` — there are no ratings,
  no reviews and nothing for sale;
- `MedicalOrganization`, `MedicalWebPage` or any other `Medical*` type — the
  site describes a demonstration product, not a clinical service, and claiming
  otherwise in a health context is the worst version of this mistake;
- `hasCredential` — there are no certifications, and the Organization node says
  so explicitly.

Phase 8 changed no page copy to improve rankings. The one metadata wording
change — the site-wide fallback description — replaced a sentence describing a
therapeutics pipeline the site does not have, and does not exist to gain
keywords.

---

## Testing

| File                              | Covers                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/seo/seo.test.ts`         | URL normalisation, unconfigured-origin behaviour, JSON-LD shape and the forbidden claims, robots.txt rules, the social card's markup                         |
| `src/components/seo/Seo.test.tsx` | The tags a page emits: one canonical, `og:url` matching it, robots, article properties, one JSON-LD document                                                 |
| `src/pages/metadata.test.tsx`     | Every route's real metadata — distinct titles and descriptions, correct canonical per route, the 404's behaviour, resource pages deriving from resource data |
| `project.test.ts`                 | The sitemap plugin is configured and excludes the 404; siteMetadata provides every field the SEO layer reads                                                 |
