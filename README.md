# NovaHealth

**Advancing science. Improving lives.**

A fictional life-sciences digital experience built with Gatsby, React and
TypeScript. NovaHealth is a demonstration project: it exists to show how a
content-driven healthcare site is engineered for accessibility, measurability,
performance and maintainability, not to sell anything.

> **Status: Phase 4 of 9 complete** — foundation, design system, layout and home page.
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

| Page               | Route                 | Status             |
| ------------------ | --------------------- | ------------------ |
| Home               | `/`                   | Complete           |
| Platform           | `/platform`           | Shell built        |
| Patient Experience | `/patient-experience` | Shell built        |
| Resources          | `/resources`          | Shell built        |
| Resource detail    | `/resources/:slug`    | Planned (template) |
| Security & Trust   | `/security`           | Shell built        |
| About & Contact    | `/about`              | Shell built        |

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

_Planned:_ keyboard navigation, focus management on client-side route changes,
accessible mobile menu, form validation and announcements, contrast verification,
reduced-motion support, and a manual screen reader pass documented in
`docs/accessibility.md`.

## Analytics

_Planned (Phase 6)._ A GTM-compatible `dataLayer` abstraction with a typed event
catalogue, so event and parameter names are enforced by the compiler rather than
by convention. Tracking plan to be documented in `docs/analytics.md`.

## API architecture

_Planned (Phase 5)._ Gatsby Functions serve `GET /api/resources` with real query
parameters, status codes and server-side filtering. The contract already exists
in [`src/types/api.ts`](src/types/api.ts) and is shared by both sides, so a
change to the response shape breaks compilation in the handler and the client
together.

## Performance

_Planned (Phase 8)._ Static generation, `gatsby-plugin-image` for responsive
AVIF/WebP, lazy loading below the fold, and no runtime CSS-in-JS.

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

_Planned (Phase 8)._ GitHub Actions running install → lint → typecheck → test →
build on Node 22, deploying to Netlify.

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

None are required for local development. `SITE_URL` overrides the canonical
origin; on Netlify, `DEPLOY_PRIME_URL` and `URL` are read automatically so
preview deploys emit their own canonical and Open Graph URLs rather than
production's.

## Deployment

_Planned._ Netlify, which runs Gatsby Functions natively and provides deploy
previews per pull request.

## Roadmap

| Phase | Scope                                       | Status   |
| ----- | ------------------------------------------- | -------- |
| 2     | Foundation and tooling                      | Complete |
| 3     | Design system, layout, navigation           | Next     |
| 4     | Home, Our Science, Treatments               | Planned  |
| 5     | Resources, resource detail, REST API        | Planned  |
| 6     | Contact form, analytics and dataLayer       | Planned  |
| 7     | Accessibility review and testing            | Planned  |
| 8     | Performance, SEO, CI/CD                     | Planned  |
| 9     | Documentation, `.ai/`, debugging case study | Planned  |

## Known limitations

- Content is served from JSON files rather than a live CMS. The boundary that
  would change is isolated to a single module.
- No end-to-end tests yet; cross-browser verification is currently manual.
- The seed content is intentionally small while the content model stabilises.

## Licence

MIT. NovaHealth is fictional. Nothing here is medical advice, and the clinical
content is illustrative.
