# Case study 1 — JSX runtime mismatch

**Phase:** 2, during toolchain setup
**Cost:** the type checker said the code was correct while two other tools said
it was not

---

## Symptoms

A component written without importing React — correct under the automatic JSX
runtime — behaved differently in each of the three tools that compile this
project:

| Tool             | Result                                   |
| ---------------- | ---------------------------------------- |
| `tsc --noEmit`   | Passed                                   |
| `jest`           | Failed: `React is not defined`           |
| `gatsby build`   | Failed at SSR with the same error        |
| `gatsby develop` | Also affected (same Babel configuration) |

## Affected area

The toolchain, not the application: `tsconfig.json`, `gatsby-config.ts` and
`jest.preprocess.js`. Every component was a potential trigger, because the
trigger was _omitting_ an import rather than writing anything unusual.

## What was observed

`React is not defined` at runtime, pointing at application code that contained
no error. The file it named was whichever component happened to render first.

## Investigation

The useful question was not "what is wrong with this component" but "why do
three tools disagree about the same file". That reframing is what located it:
the component is identical in all three runs, so the difference has to be in the
compilation, not the source.

Comparing the three configurations showed one setting expressed differently in
each:

- `tsconfig.json` — `"jsx": "react-jsx"`, the automatic runtime
- `babel-preset-gatsby` — defaulted to the classic runtime
- Gatsby itself — defaulted to the classic runtime

Under the classic runtime, JSX compiles to `React.createElement(...)`, which
requires `React` to be in scope. Under the automatic runtime it compiles to an
import of `jsx` from `react/jsx-runtime`, and no React import is needed.

TypeScript was type-checking against one contract while Babel was emitting code
for another.

## Failed assumptions

Two assumptions cost time, and both are the kind that feel safe:

1. **"A type error and a runtime error about the same symbol have the same
   cause."** Here the type checker was not wrong — it was answering a different
   question, about a different compilation.
2. **"Gatsby and `babel-preset-gatsby` inherit the TypeScript configuration."**
   They do not. `tsconfig.json` governs type checking only; Babel never reads
   it. This is the specific misconception that makes the failure surprising.

## Root cause

Three compilers, one decision, expressed in three places — and only one of them
had been set. `tsconfig.json` used the automatic JSX runtime; Gatsby's Babel
preset and Jest's transform both defaulted to the classic runtime.

## The fix

Set the runtime explicitly everywhere it is compiled:

```ts
// gatsby-config.ts
jsxRuntime: 'automatic',
```

```js
// jest.preprocess.js
presets: [
  ['babel-preset-gatsby', { reactRuntime: 'automatic', targets: { node: 'current' } }],
  '@babel/preset-typescript',
],
```

with `"jsx": "react-jsx"` already in `tsconfig.json`. All three comments in the
repository explain _why_ the setting is there, so it cannot be removed as
redundant later.

## Why the fix works

Every tool now emits and checks the same thing. A component without a React
import compiles to a `react/jsx-runtime` import in all three environments, so
`React` never needs to be in scope.

## Prevention

- The setting carries an explanatory comment in each of the three files.
- The same three-place property applies to the `@/*` path alias, declared in
  `tsconfig.json`, `gatsby-node.ts` and `jest.config.js`. That is called out in
  [../architecture.md](../architecture.md) section 7.
- `npm run build` is part of the required validation, not an optional extra.
  Both this defect and [case study 2](css-modules-ssr.md) were invisible to
  lint, types and tests.

## Lesson

**When several toolchains compile the same source, their configuration is one
decision expressed in several files, and a mismatch produces errors that appear
to come from application code.**

The practical version: when tools disagree about identical source, stop reading
the source. Compare the compilers.
