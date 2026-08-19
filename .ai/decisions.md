# Decisions

Choices that are deliberate, so an agent does not "fix" them. Each states what
was decided and why, and the full reasoning is in
[docs/architecture.md](../docs/architecture.md) unless another document is named.

Where the reason is genuinely not recorded, this file says so rather than
inventing one.

---

## Framework and rendering

**Gatsby 5 with static generation.** The site is content-driven and must be
indexable, and Gatsby gives static generation plus a build-time data layer plus
REST handlers in one repository. Gatsby 5 is the last line supporting React 18,
which is why neither is newer.

**Every page is statically generated.** No SSR at request time, no client-only
route. The resource library renders its first page of results into the HTML and
then hydrates, so crawlers and readers without JavaScript get real content.

## Content

**JSON files read by exactly one module.** `src/lib/content/source.ts` is the
only importer of `content/`. Adopting a CMS means rewriting that module and
nothing else. The JSON is shaped the way a CMS returns data — relations by id,
ISO date strings, media with required `alt` — not the way a component would
prefer it.

**No runtime validation of content.** Types are asserted at the boundary and the
invariants are tested in `source.test.ts` instead, because the data is fixed at
build time. When the source becomes a real CMS the data becomes untrusted and
validation moves to that boundary.

**`Media.alt` is required.** A missing alt is a compile error; a decorative
image must declare `alt: ""` so the decision is visible in the content.

**The pharmaceutical model was removed in the final phase.** `treatments.json`
and `research.json` modelled a drug pipeline for pages that were never built —
the project became a digital health platform instead. Nothing rendered them. Do
not reintroduce them without pages to match.

## State

**The URL is the store for resource filtering.** `?search=&category=&sort=&page=`
is parsed into a query, the query is fetched, the response is rendered. This
makes filtered views shareable, bookmarkable and correct with the back button
for free — properties a JavaScript store would have to reimplement. Nothing
keeps a second copy of filter state.

**No state management library.** URL state plus local `useState` covers this
site. Redux, Zustand and Context-as-store were considered and rejected.

**Async state is a discriminated union.** Three booleans allow
`{ isLoading: true, error: Error }`, which should be impossible. The union makes
illegal states unrepresentable and forces the empty state to be handled.

**No data-fetching library.** React Query and SWR are correct on a product with
dozens of endpoints; this has two. The ~50-line client owns timeouts,
cancellation and error mapping.

## Styling

**CSS Modules with design tokens as CSS custom properties.** No Tailwind — the
skill being demonstrated is CSS, and tokens give runtime theming. No CSS-in-JS —
runtime cost on every render works against the static-generation story.

**Two token layers.** Primitives (`--nh-slate-500`) are never used by
components; semantic tokens (`--nh-color-text`) are. A component reaching for a
primitive means the design intent was never named.

**Contrast is computed from the token file in CI.** `contrast.test.ts` parses
`tokens.css`, resolves `var()` chains and asserts real WCAG ratios, so lowering
a colour fails with the measured number.

## Accessibility

**Enforced by lint and tests, not review.** `eslint-plugin-jsx-a11y` runs at
error severity with `--max-warnings=0`, and `jest-axe` runs on every route.
Automated checks catch a minority of issues, so they are a floor: the rest is
semantic HTML by construction and a documented manual review.

**Native controls over custom widgets.** The slider is `<input type="range">`,
the filters are `<select>`, the menu is a disclosure button. Rebuilding any of
them means reimplementing keyboard behaviour, and getting it wrong removes the
control from keyboard users entirely.

**`aria-disabled` rather than `disabled` on the submitting button.** Disabling a
focused button removes it from the accessibility tree and drops focus to
`<body>` mid-action. The duplicate submission is refused in the handler instead.

**No screen reader has been run.** The NVDA-oriented review is analytical. This
is recorded as an open limitation in
[docs/accessibility.md](../docs/accessibility.md) rather than claimed as a pass.

## Analytics and consent

**Consent defaults to denied.** This is a health site aimed at a European
audience; an opt-out default would make the gate decorative. Nothing is measured
before the visitor agrees, events attempted beforehand are queued (bounded) and
flushed only if consent is granted.

**The gate lives in the facade, not at call sites.** Every event passes through
one function, so no component has to remember. Removing the whole analytics
layer would not affect anything else.

**The tracking plan is a discriminated union.** A misspelled event name or a
missing parameter is a compile error rather than a silently wrong report. Names
follow GA4 `snake_case` so they map onto GA4 without a translation layer.

**No `useAnalytics` hook.** These are pure calls; a hook would add an import, a
rules-of-hooks constraint and a memoisation question for nothing.

**The consent banner is not a modal.** A notice that traps focus makes declining
harder than accepting. Decline comes first in the tab order and carries equal
visual weight.

## SEO

**One component owns every meta tag**, and `pathname` is a required prop so a
page cannot ship without a canonical.

**No origin is invented.** With no `SITE_URL`, absolute URLs are omitted rather
than pointed at localhost — a canonical a crawler cannot reach is worse than
none.

**`noindex` pages get no canonical and no structured data.** The 404 is served
for every URL that does not exist, so a self-referential canonical would point
either at the error page or at a URL that is not real.

**Structured data claims only what the page shows.** No ratings, reviews,
prices, credentials or `Medical*` types, and the Organization node states in
`disambiguatingDescription` that the company is fictional. Tests reject the
alternatives.

## Toolchain

**Node 22, pinned in `.nvmrc`.** Gatsby 5 does not officially support Node 24.
`engines.node` and the CI workflow both derive from that pin, and
`project.test.ts` asserts they stay in step.

**Three compilers must agree.** Gatsby (Babel), `tsc` and Jest (Babel) all
compile this source. The JSX runtime is set explicitly in all three, and the
`@/` alias is declared three times — `tsconfig.json`, `gatsby-node.ts`,
`jest.config.js`. A mismatch produces errors that appear to come from
application code: see [docs/debugging/](../docs/debugging/).

**`typecheck` is separate from `build`.** Gatsby compiles TypeScript with Babel,
which strips types without checking them, so a type error would otherwise build
cleanly.

**Explicit dependency versions only.** `npm install <pkg>` means "install the
newest thing that exists", which resolved `@types/react@19` against React 18 and
`@babel/preset-typescript@8` against Gatsby's Babel 7 during setup.

**Jest's timeout is 15s.** Full-page `jest-axe` runs take seconds in jsdom and
intermittently crossed the 5s default, failing as timeouts rather than as
violations. The assertions are unchanged.

## Deliberately not done

**No end-to-end tests.** Cross-browser and screen-reader verification is
therefore manual and, in this environment, not performed. Recorded as a
limitation rather than papered over.

**No deployment.** Nothing is configured and nothing has been deployed. The
README says so plainly.

**The image plugins are kept though nothing uses them.** There are no raster
images; `gatsby-plugin-image` contributes zero bytes to any bundle. They stay so
that adding an image follows the supported path. `sharp` is a direct dependency
because the build uses it for the social card and icons.
