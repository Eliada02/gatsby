# NovaHealth

**Advancing science. Improving lives.**

A fictional life-sciences digital experience built with Gatsby, React and
TypeScript. NovaHealth is a demonstration project: it exists to show how a
content-driven healthcare site is engineered for accessibility, measurability,
performance and maintainability, not to sell anything.

> **Status: complete.** Every page, endpoint and check described below exists in
> the repository. Nothing here describes functionality that does not exist, and
> anything unverified is called out as such — including the fact that the site
> has never been deployed.

---

## Overview

NovaHealth simulates the public website of a digital health platform: a
connected patient experience covering scheduling, unified records and care team
messaging, alongside a searchable library of clinical and patient-facing
resources.

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
to a handful of routes so that each one can be finished to a production
standard, rather than spread thin across a larger site.

Every technology here is present because the work requires it. There is no state
management library, no CSS framework, no data-fetching library and no animation
library, and each of those omissions is a decision recorded in
[docs/architecture.md](docs/architecture.md).

## Pages

| Page               | Route                 | State                                                              |
| ------------------ | --------------------- | ------------------------------------------------------------------ |
| Home               | `/`                   | Complete — hero, journey, platform, impact model, security preview |
| Platform           | `/platform`           | Route shell: heading, copy and metadata only                       |
| Patient Experience | `/patient-experience` | Route shell: heading, copy and metadata only                       |
| Resources          | `/resources`          | Complete — search, filters, sort, pagination, async states         |
| Resource detail    | `/resources/:slug`    | Complete — one static page per resource                            |
| Security & Trust   | `/security`           | Complete — practices, site data handling                           |
| About & Contact    | `/about`              | Complete — story, principles, accessible contact form              |
| Not found          | `/404`                | Complete — `noindex`, route back into the site                     |

Platform and Patient Experience are honest shells: they carry a correct
document outline, landmarks and metadata, and no content pretending to be
finished. Privacy and accessibility commitments are implemented and documented
rather than given standalone pages, which is a scoping decision, not an
omission.

## Tech stack

| Layer      | Choice                                    | Why                                                                      |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| Framework  | Gatsby 5                                  | Static generation with a build-time data layer and REST handlers         |
| UI         | React 18                                  | Gatsby 5's supported peer range                                          |
| Language   | TypeScript 5 (strict)                     | Content and API contracts enforced at compile time                       |
| Styling    | CSS Modules + design tokens               | No framework dependency; scoped styles; tokens as CSS variables          |
| API        | Gatsby Functions                          | `GET /api/resources`, `POST /api/contact` — same repo, same types        |
| Analytics  | Typed `dataLayer` facade                  | GTM-compatible without a GTM dependency; consent-gated in one place      |
| SEO        | Gatsby Head API + `gatsby-plugin-sitemap` | One component owns every tag; the sitemap follows the built pages        |
| Images     | `sharp` at build time                     | The site ships no raster images; sharp renders the social card and icons |
| Linting    | ESLint 9 (flat config)                    | Includes `jsx-a11y` at error severity                                    |
| Formatting | Prettier 3                                | Formatting is not a code review topic                                    |
| Testing    | Jest + Testing Library + jest-axe         | Behaviour and accessibility in the same suite                            |
| CI         | GitHub Actions                            | Lint, format, types, tests and build on every pull request               |
| Runtime    | Node 22 LTS (`.nvmrc`)                    | Gatsby 5 does not officially support Node 24                             |

`gatsby-plugin-image`, `gatsby-plugin-sharp` and `gatsby-transformer-sharp` are
configured but currently inert: there are no raster images to process. They are
kept so that adding one follows the supported path rather than a hand-rolled
`<img>`.

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

**524 tests across 28 suites**, covering behaviour rather than implementation
details:

| Area          | Covers                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Content       | Unique slugs, known enum values, parseable dates, resolvable authors, alt text, no certification claims |
| Pure logic    | Filtering, sorting, pagination, query-string parsing, contact validation, SEO URLs and JSON-LD          |
| API           | `/api/resources` and `/api/contact` handlers, including method, body and field validation               |
| Hooks and UI  | Request states, request cancellation, search, filters, pagination, the contact form                     |
| Analytics     | Consent granted and denied, event payloads, no PII, and events that must _not_ fire                     |
| Accessibility | `jest-axe` on every route and key component, plus keyboard, focus and live-region behaviour             |
| Stylesheets   | Contrast ratios computed from tokens, reduced motion, reflow, focus rules                               |
| Repository    | Node version consistency, CI gates, workflow permissions, sitemap configuration                         |

Queries are by role and accessible name wherever possible, so a test fails when
the accessibility tree changes rather than when a class name does. There are no
snapshot tests and no coverage target.

The content tests were verified by deliberately injecting three faults (a
mistyped category, a duplicate slug, a dangling author reference) and confirming
that exactly the three relevant tests failed.

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

AI was used as a development assistant throughout — for debugging, accessibility
review, test generation and architecture exploration — and every output was
verified by running it. The judgement calls, and the decisions to reject
suggestions, are recorded in [docs/architecture.md](docs/architecture.md) and
[.ai/decisions.md](.ai/decisions.md).

The [`.ai/`](.ai/) directory exists for the other direction: it is context for
future AI agents working in this repository, so they extend the existing
architecture instead of inventing a parallel one. Start at
[.ai/README.md](.ai/README.md).

## Browser compatibility

Targets the current and previous two versions of Chrome, Edge, Firefox and
Safari, on desktop and mobile. The site was developed and measured in Chrome;
the support statement, what has and has not actually been tested, and the
degradation expected without JavaScript are in
[docs/browser-support.md](docs/browser-support.md).

## Requirements

| Requirement     | Version                 | Notes                                              |
| --------------- | ----------------------- | -------------------------------------------------- |
| Node            | 22 (pinned in `.nvmrc`) | `engines.node` is `>=22.0.0`; CI reads `.nvmrc`    |
| Package manager | npm                     | `package-lock.json` is committed; CI uses `npm ci` |
| Environment     | none required           | Every variable has a fallback — see below          |

## Installation

```bash
nvm use     # reads .nvmrc (Node 22)
npm ci      # installs exactly what package-lock.json pins
```

`npm ci` rather than `npm install`: it is reproducible, and it fails loudly if
`package.json` and the lockfile have drifted apart. Use `npm install` only when
deliberately changing a dependency.

## Development

```bash
npm run develop   # http://localhost:8000, hot reload
npm run build     # production build into public/
npm run serve     # serve that build at http://localhost:9000
```

`npm run serve` is what to measure against: `develop` ships unminified bundles
and a hot-reload socket.

## Quality checks

```bash
npm run lint         # ESLint, fails on any warning
npm run typecheck    # tsc --noEmit
npm test             # Jest
npm run build        # production build
```

`npm run validate` runs lint, typecheck and test together — the three fast gates
to run before pushing. CI runs all four plus `format:check`, in that order.

### All scripts

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run develop`      | Development server with hot reload            |
| `npm start`            | Alias for `develop`                           |
| `npm run build`        | Production build                              |
| `npm run serve`        | Serve the production build locally            |
| `npm run clean`        | Clear the Gatsby cache                        |
| `npm run lint`         | ESLint, fails on any warning                  |
| `npm run lint:fix`     | ESLint with `--fix`                           |
| `npm run format`       | Prettier, writing changes                     |
| `npm run format:check` | Prettier in check mode, as CI runs it         |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm test`             | Jest                                          |
| `npm run test:watch`   | Jest in watch mode                            |
| `npm run validate`     | Lint, typecheck and test — run before pushing |

`npm run typecheck` is separate from the build on purpose: Gatsby compiles
TypeScript with Babel, which strips types without checking them. Without an
explicit `tsc` run, a type error builds successfully.

## Project structure

```text
content/            JSON content, standing in for a headless CMS
docs/               Architecture, accessibility, analytics, performance, SEO, CI
  debugging/        Case studies of three real defects and their fixes
.ai/                Context for AI agents working in this repository
.github/workflows/  CI
src/
  api/              Gatsby Functions: /api/resources, /api/contact
  components/
    primitives/     Button, Container, Section, VisuallyHidden
    patterns/       Badge, SectionHeader, PageHero, PointsList
    layout/         Header, Footer, mobile nav, skip link, consent banner
    sections/       Home page bands
    resources/      Library: search, filters, grid, pagination, states
    contact/        Contact form and its section
    seo/            The one component that owns page metadata
  hooks/            Request state, debounce, focus trap, site metadata
  lib/
    analytics/      Consent gate, dataLayer facade, typed event helpers
    api/            Typed fetch client and per-endpoint callers
    content/        source.ts — the only module that reads content/
    contact/        Validation shared by the form and the endpoint
    resources/      URL query-string mapping, formatting
    seo/            URLs, structured data, robots.txt, social card, icons
  pages/            One file per route
  styles/           Tokens, global baseline, font faces
  templates/        Resource detail, generated per resource
  types/            Content, site, API, contact and analytics contracts
```

Tests sit beside the code they cover (`Button.tsx` / `Button.test.tsx`) rather
than in a parallel tree.

## Documentation map

| Document                                                         | Answers                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [docs/architecture.md](docs/architecture.md)                     | Why the project is built this way, and what was rejected     |
| [docs/resources-architecture.md](docs/resources-architecture.md) | How the resource library and its API fit together            |
| [docs/accessibility.md](docs/accessibility.md)                   | The accessibility target, what was audited, what is untested |
| [docs/analytics.md](docs/analytics.md)                           | The tracking plan, consent behaviour, how to add an event    |
| [docs/performance.md](docs/performance.md)                       | Baseline measurements, what changed, Lighthouse methodology  |
| [docs/seo.md](docs/seo.md)                                       | Metadata, canonicals, sitemap, robots, structured data       |
| [docs/browser-support.md](docs/browser-support.md)               | Which browsers are supported, and what was actually tested   |
| [docs/ci.md](docs/ci.md)                                         | What CI runs, why, and how to reproduce a failure locally    |
| [docs/debugging/](docs/debugging/)                               | Three real defects: symptoms, root cause, fix, prevention    |
| [docs/production-readiness.md](docs/production-readiness.md)     | The final checklist and what remains open                    |
| [content/README.md](content/README.md)                           | The content model and how to edit it                         |
| [.ai/README.md](.ai/README.md)                                   | Context for AI agents working in this repository             |

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

**Not configured, and never deployed.** There is no `netlify.toml`, no host
configuration and no deploy workflow in this repository; CI validates the build
but publishes nothing.

The intended target is Netlify, because it runs Gatsby Functions natively and
gives a deploy preview per pull request — `SITE_URL` can be left unset there,
since `DEPLOY_PRIME_URL` and `URL` are read automatically. Any host that can run
`npm ci && npm run build`, serve `public/` and execute the two functions would
work equally well.

Whoever deploys it needs to supply `SITE_URL` (or use a host that provides one),
or the build omits canonical, Open Graph and sitemap URLs by design rather than
guessing them.

## Roadmap

| Phase | Scope                                         | Status   |
| ----- | --------------------------------------------- | -------- |
| 2     | Foundation and tooling                        | Complete |
| 3     | Design system, layout, navigation             | Complete |
| 4     | Home page                                     | Complete |
| 5     | Resources, resource detail, REST API          | Complete |
| 6     | Security & Trust, About/Contact, analytics    | Complete |
| 7     | Accessibility review and testing              | Complete |
| 8     | Performance, SEO, CI/CD                       | Complete |
| 9     | Documentation, `.ai/`, debugging case studies | Complete |

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
