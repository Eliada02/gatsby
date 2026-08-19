# NovaHealth

**Advancing science. Improving lives.**

A fictional life-sciences digital experience built with Gatsby, React and
TypeScript. NovaHealth is a demonstration project: it exists to show how a
content-driven healthcare site is engineered for accessibility, measurability,
performance and maintainability, not to sell anything.

> **Status: Phase 5 of 9 complete** — foundation, design system, layout, home page and the resource library.
> Sections below marked _Planned_ describe work that is designed but not yet
> built. Nothing in this README describes functionality that does not exist.

---

## Overview

NovaHealth simulates the public website of a modern pharmaceutical company:
research programmes, a treatment pipeline, and a searchable library of clinical
and patient-facing resources.

The interesting engineering is in the resource library, which has to satisfy two
requirements that pull in opposite directions:

- resources must be **statically generated and indexable** for SEO
- resources must be **searchable, filterable and sortable at runtime**, with
  loading, error and empty states

Rather than faking one of them, the same content model feeds both paths: Gatsby
generates a static page per resource at build time, and a REST endpoint serves
the filtered list at runtime.

## Why this project exists

This project was built to demonstrate production-oriented frontend engineering
for a web developer role in healthcare communications. It is deliberately scoped
to six pages so that each one can be finished to a production standard, rather
than spread thin across a larger site.

Every technology here is present because the work requires it. There is no state
management library, no CSS framework, no data-fetching library and no animation
library, and each of those omissions is a decision recorded in
[docs/architecture.md](docs/architecture.md).

## Pages

| Page               | Route                 | Status      |
| ------------------ | --------------------- | ----------- |
| Home               | `/`                   | Complete    |
| Platform           | `/platform`           | Shell built |
| Patient Experience | `/patient-experience` | Shell built |
| Resources          | `/resources`          | Complete    |
| Resource detail    | `/resources/:slug`    | Complete    |
| Security & Trust   | `/security`           | Shell built |
| About & Contact    | `/about`              | Shell built |

Privacy and accessibility commitments are implemented and documented rather than
given standalone pages, which is a scoping decision, not an omission.

## Tech stack

| Layer      | Choice                            | Why                                                              |
| ---------- | --------------------------------- | ---------------------------------------------------------------- |
| Framework  | Gatsby 5                          | Static generation with a build-time data layer and REST handlers |
| UI         | React 18                          | Gatsby 5's supported peer range                                  |
| Language   | TypeScript 5 (strict)             | Content and API contracts enforced at compile time               |
| Styling    | CSS Modules + design tokens       | No framework dependency; scoped styles; tokens as CSS variables  |
| Images     | gatsby-plugin-image + sharp       | Responsive AVIF/WebP with no layout shift                        |
| Linting    | ESLint 9 (flat config)            | Includes `jsx-a11y` at error severity                            |
| Formatting | Prettier 3                        | Formatting is not a code review topic                            |
| Testing    | Jest + Testing Library + jest-axe | Behaviour and accessibility in the same suite                    |
| Runtime    | Node 22 LTS (`.nvmrc`)            | Gatsby 5 does not officially support Node 24                     |

## Architecture

Content flows in one direction, and UI components never reach for a data source:

```
content/*.json                     stands in for a headless CMS
      ↓
src/lib/content/source.ts          the only module that reads content
      ↓
  ┌───┴─────────────────────┐
REST handlers            build-time generation
(src/api)                (gatsby-node.ts)
      ↓                        ↓
src/lib/api (client)       static pages
      ↓
hooks → UI components
```

Full reasoning, alternatives and trade-offs are recorded in
[docs/architecture.md](docs/architecture.md).

## Accessibility

Accessibility is enforced structurally rather than audited at the end:

- `Media.alt` is a required field in the content model, so a missing alt
  attribute is a compile error rather than a review comment
- `eslint-plugin-jsx-a11y` runs at **error** severity with `--max-warnings=0`,
  so accessibility violations fail the build like type errors
- `jest-axe` is wired into `expect`, so accessibility assertions sit alongside
  behavioural ones
- Content tests reject empty alt text on non-decorative images

Beyond the tooling, the interface itself is built for it: a skip link, one set
of landmarks per page, a mobile menu with a focus trap and focus restoration,
form errors tied to their fields with a summary that takes focus, live regions
that are debounced rather than chatty, `prefers-reduced-motion` support, and
contrast computed from the design tokens in CI.

The full audit — what was checked, the issues it found, what remains untested,
and the rules for adding new components — is in
[docs/accessibility.md](docs/accessibility.md).

## Analytics

A GTM-compatible `dataLayer` abstraction with a typed event catalogue, so event
and parameter names are enforced by the compiler rather than by convention. Six
events are instrumented: `page_view`, `cta_click`, `resource_search`,
`resource_filter`, `resource_open` and `form_submit`.

Consent defaults to **denied** and is checked in one place, so nothing is
measured before the visitor agrees. No third-party script is loaded unless
`GATSBY_GTM_ID` is set. The full tracking plan, the consent behaviour and the
rules for adding an event are in [docs/analytics.md](docs/analytics.md).

## API architecture

`GET /api/resources` is a Gatsby Function with real query parameters, status
codes and server-side filtering, so the browser receives one page rather than
the whole library. `POST /api/contact` is the second, validating submissions on
the server — method, required fields, email format and field lengths — because
client-side validation is a convenience and never a control.

[`src/types/api.ts`](src/types/api.ts) is imported by both the handler and the
client, so a change to the response shape breaks compilation on both sides
rather than failing at runtime.

Request state is a discriminated union, not three booleans, and in-flight
requests are aborted when the query changes so a slow early response cannot
overwrite a fast later one. Full detail in
[docs/resources-architecture.md](docs/resources-architecture.md).

## Performance

Every route is statically generated, there is no runtime CSS-in-JS, and no
third-party script loads unless a tag manager container is configured.

The site ships no raster images at all — every graphic is an inline SVG that
repeats visible text — so the image pipeline is configured and ready rather than
exercised. The optimisation that mattered was the font: the packaged stylesheet
declared four subsets and inlined two of them into the render-blocking CSS as
base64, which cost 13.4 kB per page for scripts the site has no content in.
Declaring only the latin subsets cut that stylesheet from 20.0 kB to 9.3 kB
gzipped.

Baseline measurements, what changed, and the Lighthouse methodology are in
[docs/performance.md](docs/performance.md).

## SEO

One component owns everything a page contributes to `<head>`: title,
description, canonical, robots, Open Graph, Twitter and JSON-LD. `pathname` is a
required prop, so a page cannot be shipped without a canonical.

- **Sitemap** — generated from the pages Gatsby built, 404s excluded.
- **robots.txt** — written at build time so the sitemap URL is absolute. It does
  not block `/api/`: a crawler rendering the resource library needs that fetch.
- **Structured data** — Organization, WebSite with a working `SearchAction`, and
  Article plus BreadcrumbList on resource pages, as one `@graph` per page. The
  Organization node states in `disambiguatingDescription` that the company is
  fictional, and a test rejects ratings, reviews, prices, credentials and any
  `Medical*` type.
- **Production URL** — `SITE_URL` (or Netlify's `DEPLOY_PRIME_URL` / `URL`). No
  domain is invented: with no origin configured, absolute URLs are omitted
  rather than pointed at localhost.

Full detail in [docs/seo.md](docs/seo.md).

## Testing

Tests cover behaviour, not implementation details. Current suite:

- **Content integrity** — unique slugs, known category values, parseable dates,
  resolvable author references, non-empty alt text. These are the checks a CMS
  would run on publish; here they run in CI.
- **Toolchain smoke test** — confirms the Babel/TypeScript transform, JSX
  runtime, Testing Library and jest-axe are correctly wired.

The content tests were verified by deliberately injecting three faults (a
mistyped category, a duplicate slug, a dangling author reference) and confirming
that exactly the three relevant tests failed.

_Planned:_ resource filtering and search, request states, analytics events, form
validation, and keyboard navigation.

## CI/CD

GitHub Actions runs on every pull request and on pushes to `main`:

```
npm ci → lint → format:check → typecheck → test → build
```

Node comes from `.nvmrc`, dependencies from the lockfile, and the workflow holds
`contents: read` with no secrets and only first-party actions. A test asserts
those properties, so a future edit that adds a write permission or a
third-party action fails the suite.

The pipeline validates; it does not deploy — no environment is configured in
this repository. See [docs/ci.md](docs/ci.md).

## AI-assisted development

_Planned (Phase 9)._ The `.ai/` directory will document how AI was used as a
development assistant — debugging, accessibility review, code review, test
generation, architecture exploration — and how that output was verified. AI was
used as a development assistant, not as a replacement for engineering judgement.

## Browser compatibility

_Planned._ Targets current Chrome, Firefox, Edge and Safari. Browser-specific
considerations will be documented in `docs/browser-support.md`.

## Local development

Requires **Node 22 LTS**. With `nvm`:

```bash
nvm use          # reads .nvmrc
npm install
npm run develop  # http://localhost:8000
```

### Scripts

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run develop`   | Development server with hot reload            |
| `npm run build`     | Production build                              |
| `npm run serve`     | Serve the production build locally            |
| `npm run clean`     | Clear the Gatsby cache                        |
| `npm run lint`      | ESLint, fails on any warning                  |
| `npm run typecheck` | `tsc --noEmit`                                |
| `npm test`          | Jest                                          |
| `npm run validate`  | Lint, typecheck and test — run before pushing |

`npm run typecheck` is separate from the build on purpose: Gatsby compiles
TypeScript with Babel, which strips types without checking them. Without an
explicit `tsc` run, a type error builds successfully.

## Environment variables

None are required for local development, for CI, or for a successful build.
Every one has a documented fallback; [.env.example](.env.example) is the full
list.

| Variable              | Scope      | Effect when unset                                                      |
| --------------------- | ---------- | ---------------------------------------------------------------------- |
| `SITE_URL`            | Build only | Canonical, Open Graph and sitemap URLs are omitted rather than guessed |
| `GATSBY_GTM_ID`       | Public     | No tag manager loads, no third-party request, no cookie                |
| `GATSBY_API_BASE_URL` | Public     | The API is called on the same origin, which is correct by default      |

On Netlify, `DEPLOY_PRIME_URL` and `URL` are read automatically, so preview
deploys emit their own URLs rather than production's.

Anything prefixed `GATSBY_` is inlined into the browser bundle and is therefore
public. Never put a secret in one.

## Deployment

_Planned._ Netlify, which runs Gatsby Functions natively and provides deploy
previews per pull request.

## Roadmap

| Phase | Scope                                       | Status   |
| ----- | ------------------------------------------- | -------- |
| 2     | Foundation and tooling                      | Complete |
| 3     | Design system, layout, navigation           | Complete |
| 4     | Home page                                   | Complete |
| 5     | Resources, resource detail, REST API        | Complete |
| 6     | Security & Trust, About/Contact, analytics  | Complete |
| 7     | Accessibility review and testing            | Complete |
| 8     | Performance, SEO, CI/CD                     | Complete |
| 9     | Documentation, `.ai/`, debugging case study | Planned  |

## Known limitations

- Content is served from JSON files rather than a live CMS. The boundary that
  would change is isolated to a single module.
- No end-to-end tests yet; cross-browser verification is currently manual, and
  no screen-reader session has been run — see
  [docs/accessibility.md](docs/accessibility.md).
- The seed content is intentionally small while the content model stabilises.
- The site has never been deployed, so there is no field performance data and no
  production URL. `SITE_URL` has to be supplied at build time.
- `npm audit` reports advisories in the Gatsby 5.16 dependency tree. They are
  build-tooling packages that ship no code to the browser, and clearing them
  would mean a framework migration — see
  [docs/performance.md](docs/performance.md).

## Licence

MIT. NovaHealth is fictional. Nothing here is medical advice, and the clinical
content is illustrative.
