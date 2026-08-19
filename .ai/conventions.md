# Conventions

How to modify this codebase without fighting it. These are the patterns actually
used here, not general React advice.

---

## TypeScript

- **No `any`.** `@typescript-eslint/no-explicit-any` is an error. Where a value
  is genuinely unknown — a parsed JSON body, a caught error — use `unknown` and
  narrow it at the point of use.
- **`noUncheckedIndexedAccess` is on.** `array[0]` is `T | undefined`. Handle it;
  do not reach for `!` to silence it. In tests, `!` on a fixture you just
  defined is acceptable.
- **Model illegal states out of existence.** Async state is a discriminated
  union (`idle | loading | success | error`), never three booleans. Validation
  returns `{ ok: true, value } | { ok: false, errors }`.
- **Derive unions from `as const` arrays** when the runtime needs the list too:

  ```ts
  export const RESOURCE_SORTS = ['newest', 'oldest', 'title'] as const;
  export type ResourceSort = (typeof RESOURCE_SORTS)[number];
  ```

  The UI iterates the array, the type system validates against it, and the two
  cannot drift apart.

- **Type-only imports are explicit**: `import type { Foo } from '...'`. The lint
  rule enforces it (`consistent-type-imports`, inline fix style).

## Components

- **A file exports one component**, named, no default export (pages and
  templates are the exception — Gatsby requires a default export there).
- **Props are an interface declared above the component**, with JSDoc on
  anything whose purpose is not obvious from its name.
- **Render the right element.** `<button>` for actions, `<a>` for navigation.
  `Button` and `ButtonLink` are separate components precisely so the choice is
  made at the call site. Never a `<div>` with an `onClick`.
- **Content comes in as props.** Sections do not import from
  `lib/content/source.ts`; pages do that and pass it down.
- **Heading level is a prop** where a component can appear at different depths
  (`ResourceCard`, `PointsList`), so the document outline stays correct.
- **Explain the non-obvious in a comment, not the obvious.** The comments in
  this codebase say _why_ — why a `<span>` and not `<output>`, why focus moves
  here, why this is not a hook. Match that. Do not add comments that restate the
  code.

## Naming

- Components and types: `PascalCase`. Functions, variables, props:
  `camelCase`. Module-level constants: `SCREAMING_SNAKE_CASE`.
- Files match their default export: `ResourceCard.tsx`, `ResourceCard.test.tsx`,
  `ResourceCard.module.css`.
- Analytics event and parameter names are `snake_case` — GA4 convention — and
  live only in `src/types/analytics.ts`.
- British English in copy and comments ("behaviour", "normalise"). Identifiers
  follow the API they belong to (`color` in CSS, `analyticsLocation` in code).

## Imports

Ordered: external packages, then `@/` aliases, then relative, then styles last.

```ts
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { formatPublishedDate } from '@/lib/resources/format';
import * as styles from './ResourceCard.module.css';
```

Two hard rules:

- **CSS Modules are imported as `import * as styles`.** A default import
  type-checks, passes tests, works in `develop`, and is `undefined` during
  `gatsby build`. See [docs/debugging/css-modules-ssr.md](../docs/debugging/css-modules-ssr.md).
- **`src/api/**` uses relative imports, never `@/`.** Functions compile through
  a separate pipeline where the alias may not apply.

## Styling

- **Semantic tokens only** in components: `var(--nh-color-text)`, never
  `var(--nh-slate-900)`. If the intent has no token, add one to `tokens.css`
  with its contrast measured, and add the pairing to `contrast.test.ts`.
- One `*.module.css` per component, beside it. Class names are `camelCase` and
  must never be a JavaScript reserved word.
- Sizes in `rem`, layout in grid or flex, breakpoints in `rem`. No pixel widths
  on anything that holds content — a stylesheet test enforces this.
- Never write `outline: none` without drawing a replacement focus ring, and add
  the file to the allowlist in `stylesheets.test.ts` with the reason.
- Anything that animates on a loop must switch itself off under
  `prefers-reduced-motion: reduce`.

## Accessibility

- Semantic HTML first; ARIA only for what HTML cannot express.
- Every interactive element has an accessible name. Where the visible label is
  ambiguous out of context ("Previous"), add visually hidden text.
- Decorative SVG and glyphs are `aria-hidden="true"`.
- Form fields need a real `<label>`, `aria-invalid` when invalid, and
  `aria-describedby` pointing at their message.
- Move focus only where a user would otherwise be lost — a panel opening, a
  validation failure, content replacing what was focused. Never on load.
- One live region per job, and debounce anything driven by typing or dragging.

## Testing

- Test behaviour, not implementation. Query by role and accessible name.
- Mock `fetch`, not the module that calls it.
- Add a `jest-axe` check for any surface a user lands on.
- Assert what must _not_ happen too — no analytics before consent, no
  `form_submit` on a failed submission.
- No snapshots. No coverage target.
- Test names read as sentences about behaviour, e.g.
  `it('records nothing while consent is withheld')`.

## API and error handling

- Every failure path throws or returns a typed error; nothing is swallowed.
  `ApiError` carries a code (`network | timeout | http | parse | aborted`) so
  the UI can say something accurate.
- Messages shown to a person never contain status codes, URLs or stack detail.
- Handlers validate method, then body, then fields, and answer with a structured
  JSON body. Validation lives in a shared module so the browser and the server
  cannot disagree.
- Never log user-submitted content.

## Analytics

- Call a named helper from `lib/analytics/track.ts`. Never `dataLayer.push`.
- Never send names, email addresses, message contents, or anything that could
  identify a person or reveal a health condition.
- Where the interaction belongs to a shared primitive, pass tracking as a prop
  (`<Button tracking={{ name, location }}>`) rather than importing analytics
  into every consumer.

## Content

- Edit `content/*.json`; the types in `src/types/` define the shape.
- Nothing imports from `content/` except `src/lib/content/source.ts`.
- Content claims are constrained: no certifications, compliance claims,
  statistics presented as measured, customer names, testimonials or medical
  claims. `source.test.ts` rejects several of these by regular expression.
- Anything illustrative must say so in the content itself, not only in a code
  comment.
