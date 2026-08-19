# Performance

What the site actually ships, what was measured before changing anything, what
changed as a result, and what is still unverified.

The short version: this is a static site with no images, no client-side data
layer beyond one fetch, and no third-party script unless one is configured. The
only real payload problem the audit found was in the font loading, and it was
worth 11 kB of render-blocking CSS on every page.

---

## Baseline

Measured from a clean `gatsby build` before any Phase 8 change, on the committed
content (7 routes plus 14 resource pages).

| Asset                              | Raw                  | gzip     |
| ---------------------------------- | -------------------- | -------- |
| `styles.*.css` (render-blocking)   | 69,916 B             | 20,045 B |
| `framework-*.js` (React + Gatsby)  | 138 kB               | 45 kB    |
| `app-*.js`                         | 60 kB                | 20 kB    |
| Largest page chunk (`/resources/`) | 18 kB                | 6 kB     |
| Smallest page chunks               | 4 kB                 | 2 kB     |
| Total JS across 25 files           | 673 kB               | —        |
| Font files served (`woff2`)        | 49 kB across 2 files | —        |

### What the audit found

**Fonts — the one real defect.** `@fontsource-variable/plus-jakarta-sans/wght.css`
declares four subsets: cyrillic-ext, vietnamese, latin-ext and latin. Two of them
were small enough that webpack inlined them into the stylesheet as base64:
**13,424 bytes of font data for scripts this English-only site has no content
in**, arriving inside the render-blocking CSS on every page.

`unicode-range` normally makes an unused subset free — the browser never fetches
it. That only holds while the subset is a URL. Inlined, it is downloaded whether
it is used or not, and it blocks first paint.

**Images — nothing to optimise, and that is a finding rather than an excuse.**
The site contains no raster images at all: `src/images/` holds only `.gitkeep`,
no resource declares a `heroImage`, and there is no `<img>` element in the
source. Every graphic is an inline SVG that repeats adjacent visible text (the
wordmark, the menu icon, button arrows) and is `aria-hidden`. `gatsby-plugin-image`
appears in **zero** built bundles — grepping the output for it returns nothing —
so the configured pipeline costs no runtime bytes.

**JavaScript.** 45 kB gzip of framework, 20 kB of Gatsby's app runtime, and 2–6 kB
per route. No client-side state library, no date library, no HTTP client: the
API client is ~50 lines over `fetch`, and the analytics facade is a function that
pushes to an array. Nothing in `dependencies` is unused at runtime.

**Third-party scripts.** None load. Google Tag Manager is injected only when
`GATSBY_GTM_ID` is set, and it is unset in this repository — so there is no
third-party request and no cookie. Analytics events are queued behind the
consent gate rather than sent, and the queue is bounded.

**Rendering.** Every route is statically generated. The resource library ships
its first page of results in the HTML (`onCreatePage` injects them as page
context) and hydrates into an interactive list, so the content is present before
JavaScript runs and there is no loading flash on first paint.

---

## Changes made

### Font loading

`src/styles/fonts.css` replaced the package's four-subset stylesheet with two
`@font-face` rules — latin and latin-ext — pointing at the same files the
package ships. The font is still self-hosted and still versioned with the
dependency; the two subsets the site cannot render are simply not declared.

| Metric                        | Before   | After    | Change    |
| ----------------------------- | -------- | -------- | --------- |
| `styles.css` raw              | 69,916 B | 55,924 B | **−20 %** |
| `styles.css` gzip             | 20,045 B | 9,347 B  | **−53 %** |
| base64 font blobs in that CSS | 2        | 0        | −2        |
| `@font-face` rules            | 4        | 2        | −2        |

That is 10.7 kB less gzip on the critical path of **every** page. `font-display:
swap` is retained, so text is visible immediately in the metric-similar fallback
stack declared in `tokens.css`; latin-ext still costs nothing until a glyph in
its range appears.

### The social card

`public/og-image.png` (1200×630) is generated during `onPostBuild` from an SVG,
rasterised with `sharp` and palette-quantised — 70 kB → **34 kB**. It is fetched
by crawlers rather than by readers, so this is politeness rather than page
performance, and it never appears on a rendered page.

### Site icons

The Lighthouse run below caught something no amount of reading the source would
have: with no icon declared, every browser requests `/favicon.ico` unprompted,
gets a 404, and logs an error to the console on every page view.

`public/favicon.svg`, `favicon-32.png` and `apple-touch-icon.png` are now
generated in `onPostBuild` from one SVG (`src/lib/seo/favicon.ts`) — geometry
only, drawn on a filled tile so the mark survives a dark browser theme at 16px —
and declared in `gatsby-ssr.tsx`. They live there rather than in the Seo
component because they are identical on every page, so there is nothing for a
per-page Head to decide and nothing to diff on a route change.

### What was deliberately not changed

- **The image plugins stay.** `gatsby-plugin-image`, `gatsby-plugin-sharp`,
  `gatsby-transformer-sharp` and the `src/images` filesystem source are
  configured and unused. They contribute nothing to any bundle, and removing
  them would only make the next image harder to add correctly. `sharp` earns its
  keep at build time regardless, generating the social card.
- **No preload for the font.** With `font-display: swap` the LCP element paints
  immediately in the fallback face, so a preload would compete with the CSS for
  bandwidth to remove a swap flash rather than to speed up first paint. The
  hashed filename would also have to be threaded into the document head.
- **No code splitting beyond Gatsby's.** Route-level chunks are already 2–6 kB
  gzip. There is nothing large enough to be worth deferring.

---

## Core Web Vitals, by construction

| Metric  | Why the architecture helps                                                                                                                                                                                                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LCP** | The largest element is the hero heading — text, in static HTML, painted with a fallback face before the webfont arrives. No hero image, no video, no request on the critical path beyond one stylesheet.                                                                                                         |
| **CLS** | No images means no unsized images, the single most common cause of layout shift. The loading skeleton is sized to match a real card so results do not move the page, and the fixed header is offset with padding rather than a spacer. The consent notice reserves its own height instead of overlaying content. |
| **INP** | The only interactive work on the main thread is the search debounce (300 ms), the filter selects, and the contact form. Search input is decoupled from routing so a keystroke never triggers navigation.                                                                                                         |
| **TBT** | 45 kB gzip of framework and 20 kB of app runtime, with nothing heavier hydrating. Analytics does not execute until consent is granted.                                                                                                                                                                           |
| **FCP** | One render-blocking stylesheet, now 9.3 kB gzip, and no third-party script.                                                                                                                                                                                                                                      |

---

## Lighthouse methodology

See the results section below for what was and was not measured.

Lighthouse is run against a **production build served locally**, never against
`gatsby develop`, which ships unminified bundles and a hot-reload socket:

```bash
npm run build
npm run serve                     # http://localhost:9000
npx lighthouse http://localhost:9000/ --preset=desktop --view
```

Two caveats apply to any number obtained this way, and they are the reason these
runs are treated as a regression signal rather than as a score:

1. **There is no network.** Serving from localhost removes latency, TLS
   negotiation, DNS and any CDN behaviour. TTFB is unrealistically good and LCP
   is optimistic.
2. **The machine is not a phone.** The mobile preset simulates throttling, but
   simulated throttling on a development machine is not a mid-range Android
   device.

Real numbers come from field data (Chrome UX Report) or a lab run against a
deployed URL. Neither exists for this project, because it has never been
deployed.

### Results

Lighthouse **11.7.1**, mobile preset with simulated throttling, run against
`gatsby serve` on `localhost:9000` from a clean production build
(`SITE_URL=https://novahealth.example`). Headless Chrome. These numbers were
measured, not estimated.

| Category       | `/` | `/resources/a-practical-introduction-to-fhir-r4/` |
| -------------- | --- | ------------------------------------------------- |
| Performance    | 100 | 100                                               |
| Accessibility  | 100 | 100                                               |
| Best Practices | 100 | 100                                               |
| SEO            | 100 | 100                                               |

| Metric                   | `/`     | Resource page |
| ------------------------ | ------- | ------------- |
| First Contentful Paint   | 0.9 s   | —             |
| Largest Contentful Paint | 1.6 s   | 1.8 s         |
| Cumulative Layout Shift  | 0.025   | 0.016         |
| Total Blocking Time      | 0 ms    | 10 ms         |
| Speed Index              | 0.9 s   | —             |
| Total transferred        | 132 KiB | —             |

No audit fails in either run. Read these as an upper bound and a regression
signal, not as a production score: localhost removes the network entirely, and
the accessibility 100 means "no automated check failed", which is a floor rather
than a verdict — the real accessibility work and its limits are in
[accessibility.md](accessibility.md).

**The first run scored 96 on Best Practices**, for one reason: `/favicon.ico`
returned 404 and logged a console error on every page view. That is the finding
the site icons above came from, and the re-run after fixing it is what the table
records. Total transferred also dropped from 144 KiB to 132 KiB between the two
runs, since the failed request and its retry are gone.

---

## Known limitations

1. **No field data.** The site has never been deployed, so there is no Chrome UX
   Report data and no real-user LCP, CLS or INP. Everything above is either a
   build-output measurement or a lab observation.
2. **Lab conditions are not production conditions.** See the caveats above.
   Compression, cache headers and HTTP/2 or HTTP/3 behaviour depend entirely on
   the host and are unmeasured — the numbers in the baseline table are gzip
   sizes computed from the build output, not transfer sizes observed over a
   network.
3. **`npm audit` reports 42 advisories** (7 low, 14 moderate, 21 high),
   essentially all of them inside the Gatsby 5.16 dependency tree — `gatsby`
   itself, its parcel and graphql-codegen chains, and `sharp`. Gatsby 5.16 is the
   last release of that line, so clearing them means a framework migration, which
   is out of scope here. None of the affected packages ships code to the browser:
   they are build tooling.
4. **The `mini-css-extract-plugin` "Conflicting order" warnings persist.** They
   concern the order in which the global stylesheets (font, tokens, global) and
   the CSS modules are concatenated into one chunk. The rules do not conflict in
   practice — the modules set no properties the globals depend on — and
   suppressing the warning would mean restructuring the imports to satisfy a
   linter rather than a browser.
5. **No bundle-composition analysis.** `webpack-bundle-analyzer` is not
   installed; the JavaScript audit is based on built file sizes and on grepping
   the output for specific modules, which is enough to establish that nothing
   unexpected ships but not enough to attribute every kilobyte.
6. **The font subset decision is content-dependent.** Latin and latin-ext cover
   the current content. Publishing a resource containing Cyrillic, Greek or
   Vietnamese text would need the corresponding `@font-face` rule added back to
   `src/styles/fonts.css`, or those glyphs will render in the fallback face.
