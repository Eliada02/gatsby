# Case study 2 — CSS Modules are undefined during SSR

**Phase:** 3, while building the design system
**Cost:** a defect that passed the type checker, every test and the development
server, and appeared only in the production build

---

## Symptoms

```
TypeError: Cannot read properties of undefined (reading 'sizeDefault')
```

thrown during `gatsby build`, at the static-HTML generation step. The same code:

| Environment      | Result     |
| ---------------- | ---------- |
| `tsc --noEmit`   | Passed     |
| `jest`           | Passed     |
| `gatsby develop` | Worked     |
| `gatsby build`   | **Failed** |

`sizeDefault` is a class in `Container.module.css`, so the error named a real
class in a real stylesheet that was imported correctly by every other measure.

## Affected area

Every component importing a CSS Module — which is most of the design system. The
trigger was the _import form_, not the stylesheet.

## What was observed

The styles object was `undefined` at SSR time, so any property access on it
threw. In the browser bundle the same object was populated.

## Investigation

The environment split was the clue: development worked, production did not, and
the only structural difference between them is that a production build renders
components to static HTML in Node before hydrating them in a browser.

Gatsby runs css-loader **twice**, with different options:

| Pass                   | css-loader mode    | Emits                                  |
| ---------------------- | ------------------ | -------------------------------------- |
| Browser bundle         | default            | Named exports **and** a default export |
| Static HTML generation | `exportOnlyLocals` | Named exports **only**                 |

A default import (`import styles from './x.module.css'`) therefore resolves to a
real object in the browser and to `undefined` during SSR. TypeScript had no
opinion because the ambient module declaration at the time described a default
export — so the type checker was confirming a shape that only one of the two
passes actually produced.

The test suite could not catch it either: `jest.config.js` maps `*.css` to
`__mocks__/style-mock.ts`, so tests never load the real loader output at all.

A second, related trap surfaced from the same mechanism, and is recorded in
[../architecture.md](../architecture.md) section 7: css-loader emits one
JavaScript export per class name, so a class named `.default` produces
`export var default` — a syntax error. Class names cannot be JavaScript reserved
words.

> **Inferred, not recorded:** the order in which these two facts were
> established. What the repository records is the mechanism and the resolution;
> the reconstruction above follows from the environment split, not from notes
> taken at the time.

## Failed assumptions

1. **"If it type-checks and the tests pass, the import is correct."** Both were
   describing the browser build. Neither had visibility into the SSR pass.
2. **"`gatsby develop` is a faithful preview of `gatsby build`."** It is not.
   Development never runs the static-HTML pass, which is precisely where this
   failed.
3. **"A CSS Module is one module."** It is one file compiled twice, into two
   different shapes.

## The fix

Two changes, one of which enforces the other.

**Use namespace imports everywhere:**

```ts
import * as styles from './Container.module.css';
```

**Make the type system require that form** — `src/types/css.d.ts`:

```ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export = classes;
}
```

`export =` describes a module with no default export, so a default import is now
a compile error rather than a runtime surprise. All 35 CSS Module imports in the
repository use the namespace form; none uses a default import.

## Why the fix works

The named exports exist in both passes. Importing the namespace binds to
whatever the pass produced, so the object is populated in the browser and during
static generation alike. The ambient declaration makes the correct form the only
form that compiles, which moves the failure from build time to edit time.

## Prevention

- `src/types/css.d.ts` carries the explanation, so `export =` is not
  "simplified" into a default export later.
- The rule is stated in [../../.ai/conventions.md](../../.ai/conventions.md) as
  one of two hard import rules.
- `npm run build` is required validation. It is the only check that exercises
  the SSR pass.

## Lesson

**A build step that runs your code in two environments can compile the same file
into two different shapes. Type-check against the stricter one.**

More generally: when a defect appears only in production, look first for a stage
that development skips entirely, rather than for a difference in the code.
