# Case study 3 — Duplicate navigation landmarks

**Phase:** 3, while building the responsive header
**Cost:** a defect invisible to every visual check, caught by an automated
accessibility assertion

---

## Symptoms

`jest-axe` failed on the `Header` component with a landmark violation: two
`navigation` landmarks with the same accessible name in one page.

Nothing looked wrong. At every viewport the header rendered exactly one visible
navigation.

## Affected area

`src/components/layout/Header.tsx` and `MobileNav.tsx` — the responsive
navigation, which renders the same `PRIMARY_NAV` list twice: a horizontal bar
from 64rem up, and a panel below it.

## Accessibility impact

Landmarks are how a screen reader user skips the parts of a page they do not
need. NVDA and JAWS both offer a landmark list, and a nav landmark's accessible
name is what distinguishes "Main" from "Footer".

Two landmarks named "Main" produce:

- **an ambiguous landmark list** — two identical entries, no way to tell which
  is which, and no indication that one of them is the same links again;
- **wasted navigation** — a user cycling landmarks lands twice in what is, to
  them, the same place;
- **duplicate link announcements** — the same destinations read twice, which
  reads as a broken page rather than as a responsive design.

The visual layer hides one of them with a media query. The accessibility tree
has no media queries: both were exposed regardless of viewport, because
`display: none` was applied to the _inner list_ rather than to the landmark
itself. What a sighted user sees and what the accessibility tree contains had
diverged.

## How it was detected

`jest-axe`, in the component's own test file. This is the part worth noting:
**no manual check would have found it.** At every viewport the page looks
correct, and the defect only exists in a tree nobody renders.

## Investigation

The violation named the rule and the two elements, so the mechanism was
immediate. The real question was what to do about it: at any given viewport only
one of the two navigations is visible, so "there is only ever one" felt true.

It was not true. The DOM contained both `<nav>` elements at all times; only
their contents were hidden. Even with the landmark itself hidden at each
breakpoint, uniqueness would then have depended on a media query — and a
breakpoint change would silently reintroduce two "Main" landmarks with no test
failing at the moment of the edit.

## Failed assumptions

1. **"Two responsive presentations are two components, so each gets its own
   landmark."** The landmark describes a region of the page, not a rendering of
   it. One navigation region, one landmark.
2. **"CSS hiding is enough."** `display: none` removes an element from the
   accessibility tree, but here it was applied to the list, not the `<nav>`.
3. **"Only one is visible, so only one exists."** True for a sighted user, false
   for the accessibility tree.

## Root cause

The duplication was structural: two `<nav>` elements for one navigation region,
with uniqueness left to CSS.

## The fix

One navigation landmark containing both presentations. From `Header.tsx`:

```tsx
<nav aria-label="Main" className={styles.nav}>
  <ul className={styles.navList}>{/* desktop bar */}</ul>
  <MobileMenuPanel menu={menu} />
</nav>
```

The disclosure button that opens the panel is deliberately rendered **outside**
the landmark, with the header actions: a button that opens navigation is a
control, not a destination, and putting it inside would place a button in the
list of links a screen reader user steps through.

## Why the fix works

Uniqueness is now a property of the structure rather than of a media query.
There is one navigation region in the markup, so there is one in the
accessibility tree at every viewport, and moving a breakpoint cannot change
that.

## Prevention

- The reasoning is a comment in `Header.tsx`, so the structure is not
  "simplified" back into two elements.
- `Layout.test.tsx` asserts exactly one `banner`, one `main` and one
  `contentinfo`, and that the navigation landmarks are `['Main', 'Footer']`.
- Phase 7 generalised this: `routes.test.tsx` asserts landmark uniqueness,
  accessible names on every region, and unique element ids **for every route**,
  not just this component.
- `Header.test.tsx` runs `jest-axe` with the menu both closed and open, because
  opening it changes the tree.

## Lesson

**Responsive design duplicates markup; the accessibility tree does not have
breakpoints. If two elements exist so that CSS can choose between them, the
semantics must still resolve to one.**

And the meta-lesson: this class of defect is invisible to review and to manual
testing, which is the argument for running automated accessibility assertions in
the same suite as behavioural ones — where they fail at the moment the mistake
is made rather than in an audit months later.
