# Architecture

This document records the decisions behind NovaHealth, the alternatives that
were considered, and the trade-offs accepted. It is written so that any decision
here can be explained and defended, rather than justified after the fact.

---

## 1. The central problem

The resource library has two requirements that pull in opposite directions:

| Requirement                                                 | Implies                  |
| ----------------------------------------------------------- | ------------------------ |
| Resources must be indexable by search engines and load fast | Static HTML, built ahead |
| Resources must be searchable, filterable and sortable       | Runtime data, over HTTP  |

Choosing one and simulating the other is the easy answer and the wrong one. The
architecture instead lets **one content model feed two consumption paths**:

```
                      content/*.json
                            │
                 src/lib/content/source.ts
                            │
            ┌───────────────┴───────────────┐
      BUILD TIME                        RUNTIME
      gatsby-node.ts                    GET /api/resources
            │                               │
   a static page per resource      filtered, sorted, paginated list
   indexable, no JS required       loading / error / empty states
```

This mirrors how real content platforms work: a CMS feeds both a static build
and a runtime query endpoint.

## 2. Rendering strategy

| Page                                                        | Strategy                     | Reason                                          |
| ----------------------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| Home, Platform, Patient Experience, Security, About/Contact | SSG                          | Static content; maximum performance and SEO     |
| Resource detail                                             | SSG via `createPages`        | One indexable URL per resource                  |
| Resources                                                   | SSG shell + client-side data | Indexable landing page that becomes interactive |

The resources page renders a first page of results into the static HTML, then
hydrates. Crawlers and users without JavaScript get real content; everyone else
gets filtering. This is progressive enhancement rather than a client-only list.

## 3. Content architecture

**Decision: JSON files in `content/`, read by exactly one module.**

Content is modelled the way a headless CMS returns it, not the way a component
wants to consume it:

- relations by id (`authorIds`), not embedded objects
- ISO 8601 date strings, not `Date` instances
- media as objects with a **required** `alt`, not bare URL strings

`src/lib/content/source.ts` is the only module that imports from `content/`.
Adopting Contentful or Sanity means rewriting that module and nothing else.

**Why not source content into Gatsby's GraphQL layer?**
It was configured initially and then removed. The REST handlers need the same
data at runtime, and GraphQL nodes are a build-time construct — so content would
have needed two access paths to one dataset. Images _are_ sourced into GraphQL,
because `gatsby-plugin-image` requires it and genuinely earns its place there.

**Why no runtime validation?** The type assertion in `source.ts` is checked by
`source.test.ts`, which asserts the invariants a CMS would enforce on publish.
Validating on every page load would cost runtime for data that is fixed at build
time. When the source becomes a real CMS the data becomes untrusted and
validation moves to that boundary.

## 4. State management

**Decision: none.**

- **Filter state lives in the URL** (`?q=&category=&sort=&page=`). The URL is the
  store. That makes filtered views shareable, bookmarkable, correct with the back
  button, readable at build time, and trivially trackable in analytics — all
  properties that a JavaScript store would have to reimplement.
- **Server data** lives in a hook holding a discriminated-union request state.
- **UI state** (menu open, dialog open) is local `useState`.

Alternatives rejected: Redux, Zustand, Context for app state. Reaching for a
store here would signal that the URL was not considered first.

## 5. Request state modelling

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };
```

Three booleans (`isLoading`, `error`, `data`) allow `{ isLoading: true, error: Error }`
— a state that should be impossible. A discriminated union makes illegal states
unrepresentable and forces the UI to handle every branch, including success with
zero results. The empty state cannot be forgotten because the compiler requires
it.

**Why not React Query or SWR?** They are good libraries and would be correct on a
product with dozens of endpoints. This project has two. Hand-writing the ~50
lines demonstrates understanding of what those libraries do, which is worth more
here than the convenience they provide.

## 6. Styling

**Decision: CSS Modules with design tokens as CSS custom properties.**

|              | CSS Modules + tokens             | Tailwind            |
| ------------ | -------------------------------- | ------------------- |
| Dependencies | 0 (native to Gatsby)             | 2 plus config       |
| Demonstrates | Cascade, layout, fluid type      | Utility composition |
| Theming      | CSS variables, runtime-swappable | Build-time config   |

Tailwind is a legitimate production choice and would be right on a team already
using it. It is the wrong choice _here_ because the skill being demonstrated is
CSS.

**Rejected: CSS-in-JS** (styled-components, emotion). Runtime cost on every
render, and it works against the static-generation performance story.

## 7. Toolchain coherence

Three separate tools compile this project, and they must agree:

| Tool   | Compiles                 | Configured by        |
| ------ | ------------------------ | -------------------- |
| Gatsby | The shipped site (Babel) | `gatsby-config.ts`   |
| tsc    | Type checking only       | `tsconfig.json`      |
| Jest   | Tests (Babel)            | `jest.preprocess.js` |

This bit during setup. `tsconfig.json` used the automatic JSX runtime while both
Gatsby and `babel-preset-gatsby` defaulted to the classic runtime, so a component
that correctly omitted its React import type-checked cleanly, failed in tests
with `React is not defined`, and then failed the SSR build with the same error.

All three are now explicitly set to the automatic runtime. The general lesson:
when several toolchains compile the same source, their configuration is one
decision expressed in three files, and a mismatch produces errors that appear to
come from the application code.

The `@/*` path alias has the same property — it is declared three times
(`tsconfig.json`, `gatsby-node.ts`, `jest.config.js`) and all three must match.

### CSS Modules are compiled twice, and differently

Gatsby runs css-loader twice: once for the browser bundle, which emits both
named exports and a default export, and once for static HTML generation, which
uses `exportOnlyLocals` and emits **named exports only**.

A default import therefore type-checks, passes every test, works in
`gatsby develop`, and is `undefined` during `gatsby build`:

```
TypeError: Cannot read properties of undefined (reading 'sizeDefault')
```

All CSS Module imports use `import * as styles`, and `src/types/css.d.ts`
declares the module with `export =` so TypeScript enforces that form.

A second, related trap: css-loader emits one JavaScript export per class name,
so a class named `.default` produces `export var default`, which is a syntax
error. Class names must avoid JavaScript reserved words. Both failures surface
as webpack errors pointing at generated files rather than at the source.

## 8. Type-level enforcement

Types are used to encode team standards, not just to catch typos:

- `Media.alt` is **required**, so an image without alt text is a compile error.
  A decorative image must declare `alt: ""`, making the decision visible.
- Category, format, therapeutic area and development stage are declared as
  `as const` arrays with unions derived from them. The filter UI iterates the
  array and the type system validates against it, so options and types cannot
  drift apart.
- `noUncheckedIndexedAccess` makes indexed access return `T | undefined`, which
  forces pagination code to handle out-of-range access explicitly.
- `@typescript-eslint/no-explicit-any` is an error. Where a value is genuinely
  unknown, `unknown` forces a narrowing check at the point of use.

## 9. Accessibility strategy

Three levels, in order of reliability:

1. **Prevented by construction** — required `alt`, primitives that render real
   `<button>` and `<a>` elements, a single shared focus-ring token, contrast
   verified at the token level.
2. **Explicitly implemented** — skip link, focus management on client-side route
   changes, focus-trapped mobile menu, live-region result announcements,
   `aria-describedby` error messaging, reduced-motion support.
3. **Verified** — `jest-axe` in unit tests, and a code-level keyboard and
   screen-reader review carried out against how NVDA with Chrome behaves.
   **No screen reader was actually run**: this environment has none, and
   [accessibility.md](accessibility.md) records that as an open limitation
   rather than a completed pass.

Automated tooling catches a minority of accessibility issues. It is a floor,
not a certificate, which is why levels 1 and 3 exist.

Note on client-side routing: Gatsby ships its own route-change handling — a
`gatsby-focus-wrapper` element that takes focus and a `gatsby-announcer` live
region that reads the new page title, both visible in the built HTML. This
project therefore does not implement focus management on navigation, and the
focus management it does implement is listed in accessibility.md.

## 10. Testing strategy

| Layer         | Tool             | Covers                                        |
| ------------- | ---------------- | --------------------------------------------- |
| Content       | Jest             | Slug uniqueness, enum validity, references    |
| Pure logic    | Jest             | Filtering, sorting, pagination, error mapping |
| Hooks         | RTL              | State transitions, request cancellation       |
| Components    | RTL + user-event | Filtering, empty and error states, forms      |
| Accessibility | jest-axe         | Violations on key components                  |

Principles:

- Query by **role and accessible name**. A test that cannot find an element by
  its accessible name is evidence that a screen reader cannot either, which
  makes the functional and accessibility tests the same tests.
- **No snapshot tests.** They fail on intentional change and pass on real bugs.
- **No coverage target.** Coverage is a diagnostic, not a goal.
- **Mock at the network boundary**, not the module boundary. Mocking
  `getResources()` would test the mock; mocking `fetch` tests the code.

Tests are validated by injecting faults and confirming they fail. A test that has
never failed has not been shown to work.

## 11. Dependency policy

Every dependency is justified in the README's tech stack table. Deliberately not
installed:

| Not installed      | Instead                                       |
| ------------------ | --------------------------------------------- |
| Tailwind           | CSS Modules and tokens                        |
| Redux / Zustand    | URL as state, local `useState`                |
| React Query / SWR  | A ~50-line typed fetch client                 |
| date-fns / dayjs   | `Intl.DateTimeFormat`, which is native        |
| identity-obj-proxy | A three-line `Proxy` in `__mocks__`           |
| An icon library    | Inline SVG for the handful of icons needed    |
| ts-node            | `jest.config.js` with a JSDoc type annotation |

Two version-pinning incidents during setup reinforced the policy: `npm install`
resolved `@types/react@19` against React 18, and `@babel/preset-typescript@8`
against Gatsby's Babel 7 toolchain. `npm install <pkg>` means "install the newest
thing that exists", never "install the thing that matches this project".

## 12. Known trade-offs

| Decision                    | Cost accepted                                              |
| --------------------------- | ---------------------------------------------------------- |
| JSON content instead of CMS | No editorial workflow; mitigated by isolating the boundary |
| No data-fetching library    | Caching and deduplication are hand-written                 |
| Gatsby Functions for REST   | Ties deployment to a host that supports them (Netlify)     |
| No E2E tests initially      | Cross-browser verification is manual for now               |
| CSS Modules over Tailwind   | Slower to write; more CSS to review                        |
