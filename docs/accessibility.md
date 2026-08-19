# Accessibility

How NovaHealth is built to be usable without a mouse, without sight, without
sound, and without the fine motor control the design otherwise assumes — what
was checked, how it is kept from regressing, and what remains untested.

---

## Accessibility target

The project targets **WCAG 2.2 level AA** where applicable, and meets a number
of AAA criteria where doing so cost nothing (44px primary targets, contrast well
above the AA thresholds for most text).

"Where applicable" is doing real work in that sentence: there is no audio, no
video, no timed interaction and no authentication flow, so the criteria covering
those are not engaged. Everything that is engaged is listed below.

Two WCAG 2.2 additions are handled explicitly, because they are the ones a site
built before 2023 usually misses:

- **2.4.11 Focus Not Obscured (Minimum).** The header is fixed to the top and
  the consent notice to the bottom. `scroll-padding-top` keeps a focused element
  from landing under the header; the notice measures itself and reserves that
  much space at the foot of the document, because once the page is scrolled to
  its end no amount of scroll padding can move content out from under it.
- **2.5.8 Target Size (Minimum).** Controls are 44px where they are primary
  (buttons, the menu toggle) and never below the 24px minimum — the smallest is
  the search field's clear button at 36px, which also has a keyboard equivalent.

---

## Supported interaction

### Keyboard

Every feature works without a pointer. The specifics worth knowing:

| Surface           | Behaviour                                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skip link         | First element in the tab order on every page; targets `#main-content`, which carries `tabindex="-1"` so focus genuinely moves rather than only scrolling                                                                                   |
| Header navigation | A list of real links; the current page is exposed through `aria-current="page"` and shown with weight and background, never colour alone                                                                                                   |
| Mobile menu       | A disclosure button with `aria-expanded` / `aria-controls`; opening moves focus into the panel, Tab is confined to it, Escape closes it, and focus returns to the toggle in every closing path — Escape, a chosen link, or a click outside |
| Resource library  | Search, category and sort are native controls in reading order, then the results; filtering and paging are usable with the keyboard alone                                                                                                  |
| Pagination        | Links, not buttons, because each page has a URL; the unavailable direction is inert text rather than a "disabled link", which does not exist                                                                                               |
| Contact form      | Native inputs, a submit button that stays focusable while the request is in flight, and error summary links that move focus to the field they describe                                                                                     |
| Consent notice    | Two equally prominent buttons, Decline first in the tab order, non-modal so it never traps anyone                                                                                                                                          |

There are no positive `tabindex` values, no `autofocus`, no clickable `div` or
`span`, and no keyboard traps: the only focus confinement is the mobile panel,
which Escape always releases.

### Focus management

Focus is moved only where losing it would leave someone stranded, and never as
decoration:

- **Mobile menu open** → first link in the panel. **Close** → back to the toggle.
- **Failed validation** → the error summary, which is what explains the failure.
- **Failed submission** → the failure message.
- **Successful submission** → the confirmation that replaces the form, since the
  button the user pressed no longer exists.
- **Route change** → handled by Gatsby, which focuses its wrapper element and
  announces the new page title through its own live region.

Nothing else steals focus. The main landmark deliberately shows no focus ring
when the skip link targets it: a ring around an entire page region reads as a
rendering fault, and `main` is not an interactive control.

### Semantic HTML

Structure comes from elements, not from ARIA. Each page resolves to:

```text
banner (header)
  navigation "Main"
main
  h1
  region (section, named by its heading)
    h2 …
contentinfo (footer)
  navigation "Footer"
region "Analytics consent"   ← only until a choice is made
```

One `banner`, one `main`, one `contentinfo` per page, asserted for every route.
A `<section>` only becomes a landmark once it has an accessible name, so every
band is labelled by its own heading through `aria-labelledby`; `Container` adds
no semantics at all, precisely so it cannot introduce a nested landmark.

ARIA is used sparingly and only where HTML has no equivalent: `aria-expanded`
and `aria-controls` on the disclosure, `aria-current` from Gatsby's `Link`,
`aria-invalid` and `aria-describedby` on form fields, `aria-hidden` on
decoration, and three live regions. There are no `role="button"` divs and no
redundant roles on elements that already have one.

### Screen readers

- **Headings** run in order on every route, with exactly one `h1` — asserted per
  route rather than trusted.
- **Links** are named by what they open. Where a visible label is ambiguous out
  of context ("Previous"), a visually hidden extension names the destination
  ("Previous page, page 1"). Two navigation entries never share a name while
  leading somewhere different — the footer's shortcuts read "Digital health
  resources", not "Digital health".
- **Icons and decoration** are `aria-hidden`: the wordmark's glyph, button
  arrows, the journey's "Stage 01" labels (the ordered list already conveys
  position), the portal mock's browser chrome, and the metadata separators.
  Nothing is announced twice.
- **Images**: the site currently contains no `<img>` at all. Every graphic is an
  inline SVG that repeats adjacent visible text, so all are hidden from
  assistive technology rather than given redundant alternative text. The content
  model requires `alt` on any media that is added later, and a content test
  rejects an empty one on a non-decorative image.
- **The portal mock** is a `<figure>` whose `<figcaption>` says it is demo data
  _before_ the invented names and clinical values are read, rather than being
  hidden — withholding it would tell screen reader users less, not more.

### Dynamic content

Every live region in the application, and the one job each of them has:

| Region                         | Type            | Says                                                 |
| ------------------------------ | --------------- | ---------------------------------------------------- |
| Resource library status        | `role="status"` | "Loading resources", then "N resources found"        |
| Resource library failure       | `role="alert"`  | The failure, assertively, because it needs acting on |
| Impact model summary           | `role="status"` | The recalculated figures, once the slider settles    |
| Contact form, while submitting | `role="status"` | "Sending your message"                               |
| Contact form failure           | `role="alert"`  | That the message could not be sent                   |
| Contact form confirmation      | `role="status"` | That the message was received                        |

The last two also receive focus, which announces them on its own; the role is
kept as a safety net for the case where focus does not move.

The library's status and the impact model's summary are **debounced by 500 ms**,
so typing a search term or dragging the slider does not emit an announcement per
keystroke or per pixel. The library's polite region empties while the failure
alert is showing, so the two never speak over each other. Loading skeletons are
`aria-hidden` — a dozen empty placeholders read aloud tell nobody anything.

No page is a live region, and no announcement is made for a change the user
caused and can already see.

### Forms

The contact form is the most involved surface, so it gets the most explicit
treatment:

- a visible `<label>` for every field, associated by `htmlFor`/`id` generated
  with `useId` so a second instance on one page cannot break the association;
- `required` on the three mandatory fields (the optional one is labelled
  "(optional)"), which is what makes a screen reader announce the obligation;
- `noValidate` on the form, so the browser's unstylable and inconsistently
  announced bubbles are replaced by messages the page owns;
- `aria-invalid` on a field that failed, driving the visual state from the same
  attribute so the two cannot drift apart;
- `aria-describedby` pointing at the field's message, and keeping the message
  field's hint attached alongside the error rather than replacing it;
- an **error summary** listing every problem in field order, with links that
  reach the inputs, that receives focus when validation fails;
- errors written as sentences beginning with the word "Error" and marked with an
  icon, so the state never depends on colour;
- the field message rendered **above** its input, so at high magnification it is
  in the same view as the field it describes;
- server-side rejections rendered through the same mechanism as client-side
  ones, so a failure from `/api/contact` reads identically;
- a submit button that uses `aria-disabled`, not `disabled`, while submitting —
  disabling a focused button removes it from the accessibility tree and drops
  focus to `<body>`, losing the user's place mid-action.

### Reduced motion

Motion is optional, not removed. `prefers-reduced-motion: reduce` collapses
transition and animation durations to 0.01 ms globally — near-zero rather than
`none`, so `transitionend` listeners still fire — and switches smooth scrolling
off. Smooth scrolling is itself opt-in, applied only under
`prefers-reduced-motion: no-preference`.

The loading skeleton's pulse is switched off by name instead, because collapsing
the duration of an infinite alternating animation would freeze it at an
arbitrary opacity. The only other motion in the site is short colour and shadow
transitions and a 2px arrow nudge on hover.

### Colour and contrast

Colour is never the sole carrier of meaning: the current navigation item has
weight and a background as well as a colour, form errors have words and an icon,
and status is stated in text.

Contrast is measured from the token file rather than sampled by eye.
`src/styles/contrast.test.ts` parses `tokens.css`, resolves the `var()` chains
and computes real WCAG 2.1 ratios for every combination the interface actually
uses — body, muted and subtle text on each surface, button labels, badge text,
the focus ring against every surface it can land on, and form borders. Lowering
a colour fails CI with the measured ratio in the message.

Thresholds applied: 4.5:1 for body text, 3:1 for large text and for non-text
elements such as focus rings and form borders (WCAG 1.4.11). Several tokens
exist only because the design reference failed one of these — `--nh-slate-450`
for control borders, `sky-700` instead of `sky-600` for accent text and solid
accent buttons.

---

## Testing

### What runs in CI

| Tool                                                              | What it covers                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`eslint-plugin-jsx-a11y`** (error severity, `--max-warnings=0`) | Static JSX rules: label association, roles, `tabindex`, redundant ARIA. An accessibility violation fails the build like a type error                                                                                                                                    |
| **`jest-axe`**                                                    | Automated rule checks on rendered output: every route, the layout, the header open and closed, the resource library in its loading, error and empty states, resource detail, the contact form in its default, error, failure and success states, and the consent notice |
| **React Testing Library**                                         | Behaviour by role and accessible name — keyboard operation, focus movement, live region content, `aria-invalid`/`aria-describedby` wiring                                                                                                                               |
| **`src/styles/contrast.test.ts`**                                 | Computed WCAG contrast ratios for every token pairing in use                                                                                                                                                                                                            |
| **`src/styles/stylesheets.test.ts`**                              | Rules that only exist in CSS: reduced-motion coverage, no grid track wider than a 320px viewport, no pixel layout widths, no `outline: none` without a documented replacement ring                                                                                      |
| **`gatsby-ssr.test.tsx`**                                         | `<html lang>` on the document shell                                                                                                                                                                                                                                     |

Queries in these tests are by role and accessible name wherever possible, so a
test fails when the accessibility tree changes rather than when a class name
does.

### Manual review

A **code-level** keyboard and screen-reader review was carried out across the
layout, header and mobile menu, all seven routes, the resource library and its
asynchronous states, resource detail pages, the contact form, and the consent
notice. It covered tab order, focus movement, accessible names, heading and
landmark structure, announcement behaviour, and the CSS that governs focus
visibility, motion and reflow.

The review was **NVDA-oriented**: it was conducted against how NVDA with Chrome
on Windows behaves — browse mode reading of containers given `tabindex="-1"`,
announcement of live region insertions, name changes on a focused control not
being reliably re-announced, and the document language driving synthesiser
pronunciation. The fixes below follow from that reading.

**No NVDA session was executed.** This environment has no screen reader and no
browser automation, so nothing in this document should be read as the result of
listening to the site. The findings are analytical, and a real session with NVDA
and with VoiceOver remains outstanding — see the limitations below.

### What the audit found and changed

| Severity | Issue                                                                                                                          | Fix                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| P0       | None found                                                                                                                     | —                                                                                        |
| P1       | `<html>` had no `lang`, so a screen reader read English prose with whatever voice its synthesiser defaulted to (WCAG 3.1.1, A) | `setHtmlAttributes({ lang })` in `gatsby-ssr.tsx`, sourced from `siteMetadata.locale`    |
| P1       | Required contact fields were communicated only in prose, not programmatically                                                  | `required` on the three mandatory inputs; `noValidate` keeps the messages the page's own |
| P1       | The submit button was `disabled` while submitting, which drops focus to `<body>` mid-action                                    | `aria-disabled` plus the existing re-entry guard, and a polite "Sending your message"    |
| P2       | The fixed consent notice could entirely cover a focused element at the foot of the page (WCAG 2.2 2.4.11)                      | The notice measures itself and reserves that space while it is showing                   |
| P2       | The skip link revealed itself on `:focus-visible` only, so a programmatic focus left it off-screen                             | `:focus` as well                                                                         |
| P2       | Result grids demanded an 18rem column, which forces horizontal scrolling below a 320px viewport (WCAG 1.4.10)                  | `minmax(min(18rem, 100%), 1fr)`                                                          |
| P2       | Two footer links shared a name with primary navigation entries but led elsewhere — indistinguishable in a link list            | Renamed to "Digital health resources" and "Patient experience resources"                 |
| —        | Full-page axe runs intermittently exceeded Jest's 5s default and failed as timeouts rather than as violations                  | `testTimeout` raised to 15s; assertions unchanged                                        |

Deliberate decisions that were reviewed and left alone: the stretched card link
drawing its ring on the card via `:focus-within`; the slider's ring on the thumb
rather than the row; `main` showing no ring when the skip link targets it;
metadata separators using the decorative grey, since they are `aria-hidden` and
therefore decoration by definition; and the confirmation and failure panels
keeping their live-region roles as a safety net even though focus already moves
to them.

---

## Known limitations

These are real, not filler.

1. **No screen reader was run.** The review is analytical. NVDA + Chrome,
   JAWS + Chrome and VoiceOver + Safari passes are all outstanding, and are the
   only way to confirm announcement behaviour on the live regions, the error
   summary and the mobile menu.
2. **No browser-based accessibility run.** `jest-axe` runs in jsdom, which has
   no layout and no cascade, so axe's colour-contrast, target-size and
   visibility-dependent rules do not execute. Contrast is covered by computing
   ratios from the tokens, and reflow and motion by asserting the CSS rules —
   both are proxies for a real rendering. There is no Playwright or Cypress
   setup in this repository, and adding one was out of scope for this phase.
3. **Zoom and reflow are verified by rule, not by rendering.** 200% zoom, 400%
   zoom and the WCAG 1.4.12 text-spacing overrides have not been exercised in a
   browser.
4. **Windows High Contrast / `forced-colors` is untested.** The interface should
   survive it — focus indication uses `outline`, which forced-colors preserves,
   and no meaning is carried by a background image — but no `forced-colors`
   media rules exist and nobody has looked at the result.
5. **Touch target sizes are read from the stylesheet, not measured.** The
   smallest, the search field's clear button, is 36px: over the WCAG 2.2 AA
   minimum of 24px but under the 44px the primary controls use.
6. **The consent notice reserves its space with JavaScript.** With scripting
   disabled the notice does not render at all, so nothing is obscured; but the
   space reservation is not a CSS-only guarantee.
7. **Route change announcements come from Gatsby**, not from this codebase. The
   framework's announcer reads the new document title; its wording and timing
   are not ours to control and have not been verified with a screen reader.
8. **English only.** There is no `lang` switching for foreign-language phrases,
   because there are none in the content today.

---

## Developer guidance

Practical rules for anything added to this codebase.

**Reach for HTML first.** `<button>` for an action, `<a>` for a destination,
`<nav>`, `<main>`, `<section>`, `<ul>`, `<form>`, `<label>`. Every native
element you replace with a `div` is a keyboard behaviour, a role, a state and a
platform convention you now have to reimplement — and the mobile picker, the
type-ahead in a select, and Enter-versus-Space semantics are rarely reimplemented
correctly.

**Do not add ARIA to elements that already have semantics.** No
`role="button"` on a button. ARIA is for what HTML cannot express: disclosure
state, live regions, error association. If a new component needs more than three
ARIA attributes, the underlying markup is probably wrong.

**Keep focus visible.** Never write `outline: none` without drawing a
replacement ring somewhere more useful, and add the file to the allowlist in
`stylesheets.test.ts` with the reason. The global `:focus-visible` ring is the
default and should stay that way.

**Manage focus only where the user would otherwise be lost** — a panel opening,
a validation failure, content that replaces what was focused. Never steal focus
on load, on hover, or to draw attention.

**Associate form errors properly.** A message needs an id, the field needs
`aria-describedby` pointing at it and `aria-invalid` when it fails, and a form
with more than two fields needs a summary that takes focus. Use the shared
validation module so the browser and the server say the same thing.

**Never let colour be the only signal.** Add a word, an icon, a weight or a
shape alongside it.

**Respect reduced motion.** Short transitions inherit the global rule; anything
that loops must switch itself off under `prefers-reduced-motion: reduce`.

**Keep contrast measurable.** Use the semantic tokens; if you need a new colour,
add it to `tokens.css` and add its pairing to `contrast.test.ts`, which will tell
you the ratio.

**Keep layouts fluid.** Sizes in `rem`, grid tracks wrapped in
`min(…, 100%)`, no pixel widths on anything that holds content.

**Test new interactive components for behaviour, not markup.** Query by role and
accessible name, assert what a keyboard does, assert what changes in the
accessibility tree, and add a `jest-axe` check for any surface a user lands on.
Automated checks catch a minority of real barriers — they are the floor, not the
ceiling.
