# Debugging case studies

Three defects from this project that were worth writing down. Each was slow to
diagnose for the same reason: **the failure appeared somewhere other than where
the cause lived.**

| Case                                            | Passed                         | Failed                    |
| ----------------------------------------------- | ------------------------------ | ------------------------- |
| [JSX runtime mismatch](jsx-runtime-mismatch.md) | `tsc`                          | Tests, then the SSR build |
| [CSS Modules in SSR](css-modules-ssr.md)        | `tsc`, tests, `gatsby develop` | `gatsby build` only       |
| [Duplicate landmarks](duplicate-landmarks.md)   | Every visual check             | `jest-axe`                |

## On sourcing

These are reconstructed from what the repository records: configuration
comments written at the time of each fix, the architecture notes in
[../architecture.md](../architecture.md) (section 7 in particular), the code
that resolved each one, and the tests that now prevent recurrence.

What is **recorded**: the symptom, the mechanism, the fix, and the reasoning.

What is **not recorded**, and is therefore not claimed: exact timestamps, how
long each took, and the full sequence of things tried. Where a step is inferred
rather than documented, the case study says so.

Every error message quoted appears verbatim in the repository. None has been
invented.

## Common structure

Each case study covers: symptoms, affected area, observed behaviour,
investigation, failed assumptions, root cause, the fix, why the fix works,
prevention, and the lesson.
