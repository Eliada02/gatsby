# Browser support

What this site is built to run in, what has actually been exercised, and what
happens at the edges.

The honest summary first: **the site was developed and measured in Chrome on
Windows. No other browser has been opened.** The support statement below is
derived from the features the code uses, not from testing — every claim is
labelled with which of the two it is.

---

## Supported browsers

The intended target is the **current and previous two versions** of:

| Browser | Desktop | Mobile         |
| ------- | ------- | -------------- |
| Chrome  | ✓       | ✓ (Android)    |
| Edge    | ✓       | ✓              |
| Firefox | ✓       | ✓ (Android)    |
| Safari  | ✓       | ✓ (iOS/iPadOS) |

Build output follows Gatsby 5's default browserslist — no `browserslist` key is
set in `package.json` — so JavaScript is transpiled and prefixed for that
default rather than for the table above.

## Minimum versions, derived from the features used

These are **inferred from the CSS and browser APIs in the repository**, not
measured. The binding constraint is `:focus-visible`, which the focus system
depends on and which Safari shipped last.

| Feature                                           | Where it is used                       | Chrome/Edge | Firefox | Safari |
| ------------------------------------------------- | -------------------------------------- | ----------- | ------- | ------ |
| `:focus-visible`                                  | The global focus ring (6 stylesheets)  | 86          | 85      | 15.4   |
| CSS logical properties (`inline-size`, `inset-*`) | Layout throughout (19 stylesheets)     | 87          | 66      | 15     |
| `clamp()` / `min()`                               | Fluid type, reflow-safe grid tracks    | 79          | 75      | 13.1   |
| `gap` in flexbox                                  | Spacing throughout (26 stylesheets)    | 84          | 63      | 14.1   |
| CSS custom properties                             | The entire token system                | 49          | 31      | 9.1    |
| `AbortController`                                 | Request cancellation in the API client | 66          | 57      | 12.1   |

**Practical floor: Chrome/Edge 87, Firefox 85, Safari 15.4** — roughly Safari on
iOS 15.4 (March 2022) and later.

### Progressive, not required

| Feature                  | Used for                     | Without it                                                                 |
| ------------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| `backdrop-filter`        | Translucent header           | `@supports` guards it; the header stays opaque, which is legible by design |
| `mask-image`             | Fade on the hero dot pattern | The pattern renders without the fade                                       |
| `text-wrap: balance`     | Heading line breaks          | Headings wrap normally                                                     |
| `prefers-reduced-motion` | Suppressing animation        | Animation plays; it is short and no interaction depends on it              |

## Unsupported

- **Internet Explorer**, in any version. It is out of support, and nothing here
  targets it.
- **Safari below 15.4 and equivalents** — the focus ring degrades to `:focus`
  never matching, which would leave keyboard users without a visible indicator.
  This is the reason for the floor rather than a cosmetic one.
- **Opera Mini's extreme-saving mode** and comparable proxy browsers, which do
  not execute page JavaScript.

## JavaScript requirements

The site is statically generated, so **content does not require JavaScript**:

| Works without JavaScript                                                      | Requires JavaScript                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| Every page's content, headings, links and metadata                            | Resource search, filtering, sorting and pagination |
| The first page of the resource library (rendered into the HTML at build time) | The mobile navigation panel                        |
| Every resource detail page in full                                            | The contact form (it posts via `fetch`)            |
| The Security, About and Home page content                                     | The impact model and the consent notice            |

A crawler or a reader without JavaScript therefore gets the content and the
navigation links, and loses the interactive filtering. That is a deliberate
progressive-enhancement split, not an accident of the framework — see
[architecture.md](architecture.md).

Note that the consent notice requires JavaScript, and so does analytics: with
scripting off, nothing is measured and nothing needs to be.

## CSS expectations

- **Grid and flexbox** are assumed. There is no float fallback.
- **Custom properties** are assumed; the entire design system is tokens.
- **Container width is fluid** and everything is sized in `rem`, so a user's
  browser font size scales the layout rather than breaking it.
- No CSS resets beyond the project's own, and no vendor framework.

## Responsive behaviour

Layouts reflow from a single column upward with breakpoints in `rem`. Grid
tracks are wrapped in `min(…, 100%)` so a narrow viewport never forces
horizontal scrolling — asserted in `src/styles/stylesheets.test.ts` rather than
left to inspection.

Verified by rule, **not by opening a device**: no physical or emulated device
testing has been performed. The 320px reflow requirement is enforced by that
test, and the mobile navigation is exercised by keyboard tests in jsdom, which
is not the same as using it on a phone.

## Accessibility expectations

The accessibility work assumes a browser that implements `:focus-visible`,
`prefers-reduced-motion` and standard ARIA. The full target and its verified
scope are in [accessibility.md](accessibility.md); the short version is WCAG 2.2
AA, with automated checks in CI and a code-level review that no screen reader
has yet confirmed.

## What was actually tested

To be explicit, because this section is the one that matters:

| Check                                               | Where                                            |
| --------------------------------------------------- | ------------------------------------------------ |
| Behaviour, accessibility tree, keyboard             | jsdom via Jest — **not a browser**               |
| Lighthouse (performance, a11y, best practices, SEO) | Headless Chrome, production build served locally |
| Visual rendering, at any viewport                   | Chrome on Windows only                           |
| Firefox, Safari, Edge, any mobile browser           | **Not tested**                                   |
| Screen readers                                      | **Not tested** — see accessibility.md            |

Before deploying this to a real audience, the honest next step is a pass through
Safari on iOS and Firefox on desktop, plus one screen-reader session. Nothing in
the code suggests a problem in those environments; nobody has confirmed there
isn't one.
