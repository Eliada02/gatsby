# Continuous integration

What runs before a change can be merged, why those checks and no others, and how
to reproduce a CI failure locally.

---

## The pipeline

One workflow, `.github/workflows/ci.yml`, one job, five gates:

```
npm ci  →  lint  →  format:check  →  typecheck  →  test  →  build
```

Ordered cheapest first, and each step gates the ones after it. A formatting slip
is reported in seconds rather than after a four-minute build; a type error never
waits for the test suite.

| Step       | Command                | Fails when                                                                                         |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| Install    | `npm ci`               | `package.json` and `package-lock.json` have drifted apart                                          |
| Lint       | `npm run lint`         | Any ESLint error **or warning** — `--max-warnings=0`, and the jsx-a11y rules run at error severity |
| Formatting | `npm run format:check` | Prettier would reformat a tracked file                                                             |
| Types      | `npm run typecheck`    | `tsc --noEmit` reports anything under `strict`                                                     |
| Tests      | `npm test -- --ci`     | Any of the 522 tests fails                                                                         |
| Build      | `npm run build`        | The production Gatsby build fails                                                                  |

### Triggers

- **Pull requests** — every PR, on every push to its branch.
- **Pushes to `main`** — because a merge can produce a combination that neither
  the branch nor the base contained.

A new push cancels the run it superseded (`concurrency` with
`cancel-in-progress`), so a stale run cannot report after a newer one has
already passed.

---

## Node version

`.nvmrc` is the single source of truth. It pins **Node 22**, and:

- `package.json` `engines.node` is `>=22.0.0`;
- the workflow uses `node-version-file: .nvmrc` rather than repeating the number;
- `project.test.ts` asserts the three stay in step, so a bump in one place that
  is not mirrored in the others fails the test suite.

---

## Dependency installation

`npm ci`, never `npm install`. `ci` installs exactly what the lockfile pins and
fails if the lockfile and `package.json` disagree, which is what makes a CI run
reproducible. `actions/setup-node`'s built-in npm cache (`cache: npm`) keys on
the lockfile, so a run with unchanged dependencies restores rather than
re-downloads them.

---

## Security posture

- **`permissions: contents: read`** at workflow level. Nothing in the pipeline
  publishes, comments, tags or deploys, so nothing needs write access.
- **No secrets are used**, referenced or printed. The build runs without
  environment variables of any kind.
- **First-party actions only**, pinned to a major version:
  `actions/checkout@v4` and `actions/setup-node@v4`. Everything else is a shell
  command, so there is no third-party action in the supply chain.
- `project.test.ts` asserts all three of these properties, so a future workflow
  edit that adds a write permission, a secret or a third-party action fails the
  test suite rather than passing silently.

### Why the build runs without `SITE_URL`

CI deliberately supplies no origin. The build must succeed without one, and this
exercises the path where absolute URLs are omitted rather than guessed — see
[docs/seo.md](seo.md). A deploy supplies the origin; validating a build is a
different job from producing a deployable one.

---

## What CI does not do

- **It does not deploy.** No environment is configured in this repository, and a
  workflow that claims to deploy somewhere that does not exist is worse than no
  workflow.
- **It does not run `npm audit`.** `npm audit` reports 42 advisories, essentially
  all of them inside the Gatsby 5 dependency tree (`gatsby` itself, its parcel,
  graphql-codegen and sharp chains). None is reachable from anything this site
  serves — Gatsby's build tooling does not ship to the browser — and clearing
  them would mean a framework migration, which Phase 8 explicitly does not do.
  Adding an audit gate tuned to a level that happens to pass today would be
  theatre. The situation is recorded in [docs/performance.md](performance.md)
  under known limitations instead.
- **It does not run Lighthouse.** Performance measured from a GitHub runner
  against a locally served build tells you about the runner, not about the site.
  Lighthouse is run manually against a production build; the methodology and the
  measured results are in [docs/performance.md](performance.md).

---

## Reproducing CI locally

```bash
npm ci            # exactly what CI installs
npm run validate  # lint + typecheck + test
npm run format:check
npm run build
```

`npm run validate` is the existing shortcut for the three fast gates. If it
passes and the build passes, CI will agree: nothing in the workflow is
configured differently from local development.
