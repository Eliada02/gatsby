# Workflow

The loop for any change in this repository.

```
Inspect what already exists
        ↓
Understand the pattern it follows
        ↓
Make the smallest change that fixes the actual problem
        ↓
Add or update tests for the behaviour you changed
        ↓
npm run lint → npm run typecheck → npm test → npm run build
        ↓
Review your own diff
```

The first step is the one that gets skipped, and skipping it is how a codebase
ends up with two HTTP clients.

---

## Before you start

Read the files that already do something similar. Concretely:

- Adding a UI element → look at `src/components/primitives/` and `patterns/`
  before writing markup.
- Fetching something → `src/lib/api/client.ts` already owns timeouts and error
  mapping.
- Reading content → `src/lib/content/source.ts` is the only door.
- Measuring something → `src/lib/analytics/track.ts` already has a helper, or
  needs one added in the documented way.
- Adding a page → copy the shape of `src/pages/security.tsx`, including its
  `Head` export.

Then check [decisions.md](decisions.md). If something looks wrong or
over-engineered, it may be recorded there with a reason.

## Validation

Run all four before claiming a change is done. They are ordered cheapest first,
which is also the order CI runs them in:

```bash
npm run lint         # ESLint, --max-warnings=0, jsx-a11y at error severity
npm run typecheck    # tsc --noEmit, strict
npm test             # Jest, jsdom, jest-axe
npm run build        # gatsby build — the only check that exercises SSR
```

`npm run validate` chains the first three. **The build is not optional**: CSS
Module imports, the JSX runtime and anything touching SSR fail only there — see
[docs/debugging/](../docs/debugging/) for two defects that passed everything
except the build.

If you changed formatting-sensitive files, `npm run format:check` too; CI runs
it and it fails on a stray blank line.

## By kind of change

### Feature work

Find the existing pattern; extend it. New content goes in `content/*.json` with
a type in `src/types/`. New UI composes primitives. New async state uses the
existing request-state union. Add tests that describe behaviour, and a
`jest-axe` check if a user lands on it.

### Bug fixes

Write the failing test first, in the file beside the code. Fix the cause, not
the symptom — if the fix is a special case at a call site, the cause is probably
upstream. Keep the test; it is the record that the bug existed.

### Accessibility changes

Read [docs/accessibility.md](../docs/accessibility.md) first: many things that
look like oversights are documented decisions (the card's focus ring on the
wrapper, `main` showing no ring, the deliberate live-region choices).

Assert behaviour, not markup: what a keyboard does, what an accessible name
resolves to, where focus lands. `jest-axe` is a floor, not a verdict — it cannot
catch a wrong focus order or a misleading label.

Never remove an `aria-*` attribute, a label, a focus ring or a live region to
simplify a component.

### API changes

Change `src/types/api.ts` first — it is imported by both the handler and the
client, so the compiler will show you every site that needs updating. Validate
on the server even when the browser already validated; use the shared module in
`src/lib/contact/` as the model. Test the handler directly with a fake request
and response; no server is started.

### Analytics changes

Follow the five steps in [docs/analytics.md](../docs/analytics.md): define the
event in `src/types/analytics.ts`, add a named helper, call it from the
component that owns the interaction, test it with consent granted **and**
denied, and add a row to the tracking-plan table.

Never add a field that could identify a person. Never call `dataLayer.push`
directly.

### Documentation changes

Documentation in this repository states what is true today. If you change
behaviour, update the document that describes it in the same change — the
docs/README table in [README.md](../README.md#documentation-map) shows which one.

Do not claim a test, a measurement or a deployment that was not performed. Where
something is inferred rather than observed, say so.

### Dependency changes

Don't, unless there is a concrete reason you can state. If you must:
`npm install <pkg>@<explicit-version>` — never bare `npm install <pkg>`, which
resolves the newest thing that exists rather than the thing that matches this
project. Commit the lockfile, then run all four checks.

## Before you finish

Review the diff as if someone else wrote it:

- Only files you meant to touch.
- No `console.log`, no commented-out code, no `TODO` you have no intention of
  doing.
- No secrets, no `.env`, nothing from `public/` or `.cache/`.
- Tests added for new behaviour, and no existing test weakened to make yours
  pass.
- Documentation updated if behaviour changed.

State plainly what you did not verify. A change described accurately with a
known gap is worth more than one described as complete when it is not.
