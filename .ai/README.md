# AI context

Context for AI agents working in this repository. Four files, kept short enough
to read in full before making a change:

| File                               | Read it when                                                       |
| ---------------------------------- | ------------------------------------------------------------------ |
| [architecture.md](architecture.md) | You need to know where something lives and how data flows          |
| [conventions.md](conventions.md)   | You are about to write code                                        |
| [workflow.md](workflow.md)         | You are about to start, or about to finish, a change               |
| [decisions.md](decisions.md)       | Something looks wrong or over-engineered and you want to change it |

The deeper documentation is in [`docs/`](../docs/), and this directory links to
it rather than repeating it.

---

## The one rule

**Inspect the existing architecture before introducing new abstractions.**

Nearly everything you might need already exists here: a design system, an HTTP
client, a content boundary, an analytics facade, a consent gate, a validation
module shared between the browser and the server, an SEO component that owns
every meta tag, and test utilities. Adding a second one of any of those is the
most damaging thing you can do to this codebase, and it will pass review by
looking reasonable in isolation.

Before you write a helper, a hook, a wrapper or a `<div>` with a click handler,
search for the thing that already does it.

## What this project expects of you

- **Preserve existing patterns.** Consistency is worth more than your preferred
  style. If a pattern seems wrong, check [decisions.md](decisions.md) — it may
  be a deliberate choice with a recorded reason.
- **Prefer the smallest change that fixes the actual problem.** This repository
  is finished. It does not need a refactor.
- **Do not add dependencies.** The dependency list is short on purpose, and
  [docs/architecture.md](../docs/architecture.md) records what was deliberately
  not installed and what is used instead. If you believe a dependency is
  genuinely required, say so and explain the alternative you rejected.
- **Maintain accessibility.** Semantic HTML first, ARIA only where HTML cannot
  express the thing. Never remove a focus ring, a label, a live region or an
  `aria-*` attribute because it looks verbose. See
  [docs/accessibility.md](../docs/accessibility.md).
- **Maintain TypeScript strictness.** No `any`, no `@ts-ignore`, no non-null
  assertion to silence a real possibility. `strict` and
  `noUncheckedIndexedAccess` are on, and they are load-bearing.
- **Maintain the tests.** Add tests for new behaviour, and never weaken an
  existing test to make a change pass. If a test fails, the test is usually
  right.
- **Respect content integrity.** NovaHealth is a fictional company. Do not add
  certifications, compliance claims, statistics, customer names, testimonials,
  ratings or medical claims — not in page copy, not in metadata, not in
  structured data. Tests actively reject several of these, and they are there
  because a health site making false claims is the worst failure this project
  could ship.
- **Run the validation.** `npm run lint`, `npm run typecheck`, `npm test` and
  `npm run build` all have to pass. See [workflow.md](workflow.md).

## What is deliberately absent

Do not add these back without a stated reason:

state management library · CSS framework · data-fetching library · form library ·
icon library · date library · animation library · component library · analytics
SDK · `any` · snapshot tests · a coverage target

## Where the real detail lives

| Question                                 | Document                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Why is it built this way?                | [docs/architecture.md](../docs/architecture.md)                     |
| How does the resource library work?      | [docs/resources-architecture.md](../docs/resources-architecture.md) |
| What are the accessibility rules?        | [docs/accessibility.md](../docs/accessibility.md)                   |
| How do I add an analytics event?         | [docs/analytics.md](../docs/analytics.md)                           |
| What is the performance budget and why?  | [docs/performance.md](../docs/performance.md)                       |
| How does metadata get onto a page?       | [docs/seo.md](../docs/seo.md)                                       |
| What runs in CI?                         | [docs/ci.md](../docs/ci.md)                                         |
| What broke before, and how was it fixed? | [docs/debugging/](../docs/debugging/)                               |
| How do I edit content?                   | [content/README.md](../content/README.md)                           |
