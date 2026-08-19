# Production readiness

The state of NovaHealth at the end of the final engineering phase, item by item.
An unchecked box is not an oversight — it is a statement that the thing has not
been verified, and each one says what would verify it.

**Verdict: production ready with documented limitations.** Everything the
repository controls is done and checked. What remains open is everything that
requires a browser, a screen reader or a deployed URL — none of which exists in
the environment this was built in.

---

## Architecture

- [x] **Architecture documented** — [architecture.md](architecture.md) for the
      reasoning and rejected alternatives, [../.ai/architecture.md](../.ai/architecture.md)
      for the map, [resources-architecture.md](resources-architecture.md) for the
      library.
- [x] **No known critical architectural issues.** One content boundary, one HTTP
      client, one analytics facade, one SEO component, no state library, no
      circular dependencies.
- [x] **Decisions recorded**, including the ones that look like omissions:
      [../.ai/decisions.md](../.ai/decisions.md).

## Accessibility

- [x] **Keyboard navigation** — every feature operable without a pointer; focus
      trap and restoration on the mobile menu; no keyboard traps.
- [x] **Focus management** — moved only where a user would otherwise be lost,
      listed in [accessibility.md](accessibility.md).
- [x] **Semantic HTML and landmarks** — one `banner`, `main` and `contentinfo`
      per route, asserted for every route.
- [x] **Forms** — labels, `aria-invalid`, `aria-describedby`, an error summary
      that takes focus, and no state carried by colour alone.
- [x] **Contrast** — computed from the design tokens in CI, not sampled by eye.
- [x] **Reduced motion** — respected globally; looping animation switched off by
      name.
- [x] **Automated checks** — `jest-axe` on every route and key component;
      `eslint-plugin-jsx-a11y` at error severity.
- [ ] **Screen reader session** — _not performed._ No screen reader exists in
      this environment. The NVDA-oriented review is analytical. Verified by: one
      pass with NVDA + Chrome and one with VoiceOver + Safari.
- [ ] **Zoom and text spacing (WCAG 1.4.4, 1.4.12)** — enforced by stylesheet
      rules, not exercised in a browser at 200%/400%.

## Performance

- [x] **Images** — the site ships none; the one raster asset (the social card)
      is generated at build time and never loads on a page.
- [x] **Fonts** — only the subsets the site can render; no base64 font data in
      the render-blocking CSS. Stylesheet is 9.3 kB gzipped.
- [x] **JavaScript reviewed** — 45 kB gzip framework, 20 kB app, 2–6 kB per
      route; no unused runtime dependency.
- [x] **Third-party scripts** — none load. GTM only when `GATSBY_GTM_ID` is set.
- [x] **Measured** — Lighthouse 100/100/100/100 on the home page and a resource
      page, against a production build served locally.
- [ ] **Field data** — _none._ The site has never been deployed, so there is no
      Chrome UX Report data and no real-user LCP, CLS or INP.
- [ ] **Transfer-level verification** — sizes are gzip figures computed from
      build output; compression, cache headers and HTTP/2 depend on the host.

## SEO

- [x] **Metadata** — every route has its own title and description; a test
      rejects the site-wide fallback appearing on a page.
- [x] **Canonical URLs** — exactly one per indexable page, absolute, matching
      `og:url`; none on `noindex` pages.
- [x] **Sitemap** — generated from the built pages, 20 URLs, 404s excluded.
- [x] **robots.txt** — generated at build time with an absolute sitemap URL;
      does not block `/api/`.
- [x] **Open Graph and Twitter** — full set, with a generated 1200×630 card.
- [x] **Structured data** — Organization, WebSite with a working `SearchAction`,
      Article and BreadcrumbList, one `@graph` per page.
- [ ] **Validated against Google's Rich Results Test** — _not performed;_ it
      requires a public URL. The shapes are asserted in unit tests instead.

## Security

- [x] **No secrets committed** — no `.env`, no credentials, no tokens; CI uses
      none.
- [x] **Environment variables documented** — [.env.example](../.env.example) and
      the README table; all optional, all with fallbacks.
- [x] **`GATSBY_`-prefixed variables are public by design** and documented as
      such, so a secret cannot be added to one by accident.
- [x] **API validation** — both endpoints validate method and input server-side;
      the contact endpoint never logs or echoes submitted data.
- [x] **Consent behaviour** — defaults to denied, gated in one place, non-modal
      banner with equal-weight choices.
- [ ] **Dependency advisories** — `npm audit` reports 42, essentially all inside
      the Gatsby 5.16 dependency tree. They are build tooling and ship no code
      to the browser; clearing them means a framework migration.
- [ ] **Rate limiting / spam protection on `/api/contact`** — _not implemented._
      The endpoint validates and discards; it delivers nothing, so there is
      nothing to abuse beyond compute. Required before it sends real mail.

## Testing

- [x] **524 tests, 28 suites**, all passing.
- [x] **Accessibility tests** in the same suite as behavioural ones.
- [x] **Lint** — ESLint 9 flat config, `--max-warnings=0`.
- [x] **Typecheck** — `tsc --noEmit` under `strict` and
      `noUncheckedIndexedAccess`.
- [x] **Production build** passes, with and without `SITE_URL`.
- [x] **Test quality** — behaviour over implementation, no snapshots, no
      coverage target, faults injected to confirm tests fail when they should.
- [ ] **End-to-end tests** — _none._ jsdom is not a browser. Verified by: a
      Playwright pass over the library, the form and the menu.

## CI/CD

- [x] **GitHub Actions** on pull requests and pushes to `main`.
- [x] **Deterministic installation** — `npm ci` from the committed lockfile.
- [x] **Full validation** — lint, format, typecheck, test, build, cheapest
      first.
- [x] **Least privilege** — `contents: read`, no secrets, first-party actions
      only, asserted by a test.
- [ ] **Deployment** — _not configured._ No host, no `netlify.toml`, no deploy
      workflow. CI validates and publishes nothing.

## Documentation

- [x] [README.md](../README.md) — overview, stack, requirements, installation,
      development, quality checks, structure, documentation map, deployment.
- [x] [architecture.md](architecture.md) — decisions, alternatives, trade-offs.
- [x] [analytics.md](analytics.md) — the tracking plan and how to extend it.
- [x] [accessibility.md](accessibility.md) — target, audit, limitations,
      developer rules.
- [x] [performance.md](performance.md) — baseline, changes, Lighthouse
      methodology and results.
- [x] [seo.md](seo.md) — metadata, canonicals, sitemap, robots, structured data.
- [x] [browser-support.md](browser-support.md) — supported browsers and what was
      actually tested.
- [x] [debugging/](debugging/) — three case studies.
- [x] [../.ai/](../.ai/) — context for future AI agents.
- [x] **Documentation matches the code.** Every command in every document was
      checked against `package.json`, and the claims that had gone stale were
      corrected in this phase.

## Content integrity

- [x] **No fabricated certifications, compliance claims or audited statuses** —
      and tests reject them by regular expression in both content and structured
      data.
- [x] **No invented statistics** — the hero metrics are labelled product targets
      and the impact model states it is illustrative.
- [x] **No real organisations named** as customers or partners; the credibility
      band says the organisations are fictional.
- [x] **No testimonials, ratings or customer counts** anywhere.
- [x] **The fictional nature is stated** in the footer, the consent notice, the
      contact form, the Security page and the Organization JSON-LD.

---

## What would change the verdict

Three things, in order of importance:

1. **A screen-reader session.** The accessibility work is thorough and
   automated checks pass, but nobody has listened to it.
2. **A real deployment with a real origin.** `SITE_URL` drives canonicals, the
   sitemap and Open Graph; all of it is untested against a live host.
3. **A cross-browser pass.** Chrome only, so far.

None of these is a code change. They are all "someone has to run it somewhere",
which is exactly the kind of limitation worth stating plainly rather than
implying it has been handled.
