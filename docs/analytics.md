# Analytics

The tracking plan for NovaHealth: what is measured, when it fires, what it
carries, and what may never be added to it. Written for whoever builds the
reports as much as for whoever writes the next component.

Everything below is implemented. The event definitions live in
[`src/types/analytics.ts`](../src/types/analytics.ts) and this document is a
description of that file, not a wish list — if the two disagree, the TypeScript
is right and this page is stale.

---

## The tracking plan

Every event is emitted through a named helper in
[`src/lib/analytics/track.ts`](../src/lib/analytics/track.ts). No component
assembles an event object, and no component calls `dataLayer.push` directly.

| Event             | Trigger                                              | Required properties                                                   | Optional properties | Consent required |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------- | ---------------- |
| `page_view`       | Route change, including the first load               | `page_path`, `page_title`                                             | `referrer_path`     | Yes              |
| `cta_click`       | A call to action with a `tracking` prop is activated | `cta_name`, `cta_location`, `destination`                             | —                   | Yes              |
| `resource_search` | Library search settles and its results arrive        | `search_term`, `results_count`                                        | —                   | Yes              |
| `resource_filter` | Category or sort changes and the results arrive      | `filter_type`, `filter_value`, `results_count`                        | —                   | Yes              |
| `resource_open`   | A resource card title link is activated              | `resource_id`, `resource_title`, `resource_category`, `list_position` | —                   | Yes              |
| `form_submit`     | The contact form is accepted by `/api/contact`       | `form_name`, `form_status`                                            | `error_fields`      | Yes              |

There is no `resource_download`. It was in the original plan and is deliberately
absent: nothing on the site offers a download, so defining it would put an entry
in the plan that a report would be built around and then wait indefinitely for.
It gets defined when a download surface exists.

### Property values

| Property            | Type                   | Notes                                                                                                                                                                                                      |
| ------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_path`         | string                 | Path only, no origin and no query string.                                                                                                                                                                  |
| `page_title`        | string                 | Read one tick after the route change, because Gatsby's Head API updates the title after the transition commits.                                                                                            |
| `referrer_path`     | string                 | Absent on the first view of a session; present on every client-side navigation after it.                                                                                                                   |
| `cta_name`          | string                 | The visible label of the call to action.                                                                                                                                                                   |
| `cta_location`      | `AnalyticsLocation`    | One of `hero`, `header`, `footer`, `platform_overview`, `impact_calculator`, `security_preview`, `final_cta`, `resource_library`, `resource_detail`, `contact`. A closed union so reports can group by it. |
| `destination`       | string                 | The `to` of the link, unless the call site overrides it. For a `Button` it is supplied explicitly.                                                                                                         |
| `search_term`       | string                 | Trimmed, as typed. Free text a visitor entered — see [PII](#pii-restrictions).                                                                                                                             |
| `results_count`     | number                 | `meta.total` from the response the interaction produced, so a zero-result search is analysable.                                                                                                            |
| `filter_type`       | `'category' \| 'sort'` |                                                                                                                                                                                                            |
| `filter_value`      | string                 | The category or sort key. Clearing the category records `all`.                                                                                                                                             |
| `resource_id`       | string                 | Content id, e.g. `res-001`.                                                                                                                                                                                |
| `resource_title`    | string                 |                                                                                                                                                                                                            |
| `resource_category` | string                 | The category key, e.g. `digital-health`, not the display label.                                                                                                                                            |
| `list_position`     | number                 | 1-based position within the list the card was rendered in, for click-through analysis.                                                                                                                     |
| `form_name`         | string                 | Currently only `contact`.                                                                                                                                                                                  |
| `form_status`       | `'success' \| 'error'` | See the note below: only `success` is emitted today.                                                                                                                                                       |
| `error_fields`      | string[]               | Field **names** only, never values. Omitted entirely on success.                                                                                                                                           |

### Where each event is emitted

| Event             | Emitted from                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `page_view`       | `gatsby-browser.tsx`, in `onRouteUpdate`                           |
| `cta_click`       | `src/components/primitives/Button.tsx` (`Button` and `ButtonLink`) |
| `resource_search` | `src/components/resources/ResourceLibrary.tsx`                     |
| `resource_filter` | `src/components/resources/ResourceLibrary.tsx`                     |
| `resource_open`   | `src/components/resources/ResourceCard.tsx`                        |
| `form_submit`     | `src/components/contact/ContactForm.tsx`                           |

### Counting rules worth knowing before you build a report

These are behaviours a report will otherwise misread:

- **`cta_click` is opt-in.** Only a `Button` or `ButtonLink` given a `tracking`
  prop records anything. Navigation links, pagination and the resource card link
  are not calls to action and do not emit it.
- **`resource_search` fires once per settled term, not per keystroke.** The
  field debounces by 300 ms, and the event is emitted when the results for that
  term arrive — so `results_count` always describes what the reader actually saw.
- **A page opened from a shared or bookmarked URL emits no
  `resource_search` or `resource_filter`.** The filters were already in the URL;
  only interactions are measured. That visit is still counted by `page_view`.
- **Clearing the search field is not a search.** Clearing the category _is_ a
  filter change, recorded as `filter_value: "all"`.
- **A failed request drops the pending interaction.** If a search or filter
  request fails, no event is emitted for it — an event attached to a later
  response would report a count that was never on screen.
- **`resource_open` and `page_view` are both emitted when a resource is
  opened.** That is intentional and not double counting: `page_view` answers
  "which resource was read", `resource_open` answers "which card, in which
  position, led there". Neither substitutes for the other.
- **`form_submit` is only emitted for a submission the server accepted.** A
  submission blocked by client-side validation, rejected by `/api/contact`, or
  lost to a network failure emits nothing at all. `form_status: 'error'` and
  `error_fields` are defined in the plan and supported by the helper, but no
  call site emits them today; treat `form_submit` as a success count.

---

## Consent

Analytics are gated on consent, in one place, for every event.

- **The default is denied.** [`src/lib/analytics/consent.ts`](../src/lib/analytics/consent.ts)
  reports `unset` until a visitor chooses, and `hasAnalyticsConsent()` is false
  for anything but an explicit `granted`. An opt-out default would make the gate
  decorative.
- **The gate lives in the facade, not at the call sites.** Every event passes
  through `trackEvent()` in [`src/lib/analytics/dataLayer.ts`](../src/lib/analytics/dataLayer.ts),
  which drops it if consent has not been granted. No component has to remember.
- **Events attempted before consent are queued, not discarded.** Up to 20 are
  held in memory. If the visitor then accepts, the queue is flushed, so the page
  view that happened while the banner was showing is not lost. The bound stops a
  visitor who never consents from growing the array indefinitely. Nothing is
  persisted: a reload with no consent loses the queue, which is the correct
  outcome.
- **Declining is as prominent as accepting.** The banner
  ([`ConsentBanner.tsx`](../src/components/layout/ConsentBanner.tsx)) is a
  non-modal region, lists Decline first in the tab order, and styles both
  choices with equal weight.
- **The choice is stored in `localStorage` under `nh-analytics-consent`** and
  applies across tabs. Storage being unavailable is treated as "no choice
  recorded", never as consent.

The gate is one function and one storage key: removing the whole measurement
layer would not affect anything else in the application.

This is not a consent management platform. A production site would use one, with
per-purpose categories and a documented audit trail. This is the smallest
correct version: a default of no, a remembered choice, and a single function
every event passes through.

---

## GTM integration

### `GATSBY_GTM_ID`

The container ID, read in [`gatsby-ssr.tsx`](../gatsby-ssr.tsx) at build time.
It is unset in this repository, and that is deliberate: with no ID, **no
third-party script is requested and no cookie is set**, while the dataLayer
still receives every event — so instrumentation is verifiable in the browser
console without loading someone else's container. Set it in `.env.production`
(or the deploy environment) to switch GTM on.

The `GATSBY_` prefix is what makes the value available to browser code; see
[`.env.example`](../.env.example).

### How events reach the dataLayer

```
component / route change
        │
   named helper           src/lib/analytics/track.ts       (one per event)
        │
   trackEvent()           src/lib/analytics/dataLayer.ts   (typed, consent-gated)
        │
        ├── no consent → queued (max 20), or dropped
        │
        └── consent → window.dataLayer.push(event)
                              │
                       GTM container (only when GATSBY_GTM_ID is set)
                              │
                       GA4 custom events
```

`gatsby-ssr.tsx` creates `window.dataLayer = window.dataLayer || []` in the
document head **before** the container script. Events fired during page
initialisation are then queued by the array rather than lost, which is the usual
cause of a missing first `page_view`. The facade recreates the array if it is
absent, so the instrumentation also works with no container at all.

In development, every pushed event is logged to the console as
`[analytics] <event_name>`, so the plan can be inspected without GTM or a
network tab full of collect requests.

### Container configuration

Each event name maps onto a GA4 custom event of the same name, and each property
maps onto a custom parameter of the same name. Because the payloads already use
GA4 conventions, no translation layer is needed in the container: trigger on the
Custom Event name, pass the parameters straight through, and register the ones
you want to report on as custom dimensions or metrics.

---

## Event naming conventions

GA4 conventions, applied without exception:

- `snake_case` for event names and for every property name.
- Event names are `object_action` (`resource_open`, `form_submit`), not
  `actionObject` and not camelCase.
- Property names are unprefixed and descriptive (`results_count`, not
  `nhResultsCount`).
- Values that reports group by are closed unions in TypeScript
  (`AnalyticsLocation`, `filter_type`, `form_status`), so a new value is a
  deliberate change to the plan rather than a typo that fragments a dimension.
- Keys and ids are sent, not display labels (`digital-health`, not
  "Digital health"), because labels are copy and copy changes.

The reason this is enforced by types rather than by review: the most common way
analytics breaks is not missing instrumentation but inconsistent naming —
`cta_click` in one component and `ctaClick` in another. Reports get built on the
first spelling, a later change ships the second, and the data goes quietly wrong
for weeks. Here that is a compile error.

---

## PII restrictions

This is a health site. The rules are not negotiable and are asserted in tests.

**Never send:**

- names, email addresses, organisations or message contents — the contact form
  emits `form_name` and `form_status` and nothing else;
- anything that could describe a health condition, treatment or appointment;
- identifiers that resolve to a person: account ids, session ids that outlive
  the visit, IP addresses, precise geolocation;
- full URLs including query strings, which can carry any of the above.

**What is deliberately allowed, and why:**

- `search_term` is free text a visitor typed. It is the one field where someone
  could enter something personal. It is kept because a search plan without terms
  is unusable, and it is the field to review first if the site ever collects
  anything sensitive.
- `resource_title` and `resource_id` describe published content, not a person.
- `error_fields` carries field **names** only. Values from a contact form are
  personal data and have no place in an analytics payload.

If you are adding an event and are unsure, the test to apply is: could this
value identify the person who sent it, or reveal something about their health?
If yes, it does not go in the payload.

---

## Adding an event

Five steps, in this order:

1. **Define it** in `src/types/analytics.ts`: an interface with a literal
   `event` name and its properties, added to the `AnalyticsEvent` union and to
   the `ANALYTICS_EVENTS` array. The array is `satisfies` -checked against the
   union, so a name that appears in one and not the other fails to compile.
2. **Add a named helper** in `src/lib/analytics/track.ts` that takes plain
   arguments and assembles the payload. Call sites should never have to know a
   parameter name.
3. **Call it from the component** that owns the interaction — through a prop
   like `tracking` where the interaction belongs to a shared primitive, so the
   analytics import does not spread across every consumer.
4. **Test it with consent granted and denied**, and assert the payload exactly.
   `resetPendingEvents()` clears the queue between cases.
5. **Add a row to the table at the top of this document**, including the
   counting rule if there is anything surprising about when it fires.

Do not add a `dataLayer.push` anywhere. Do not add an analytics SDK: the facade
exists so that swapping GTM for Segment, Plausible or a first-party endpoint is
a change to one file rather than to every component that measures something.

---

## Engineering constraints

- **One facade.** `window.dataLayer` is touched in exactly one module.
- **One gate.** Consent is checked in exactly one function.
- **No hook.** There is no `useAnalytics`. A hook exists to reach state, context
  or the lifecycle; these are pure calls, and wrapping them would add an import,
  a rules-of-hooks constraint and a memoisation question in exchange for
  nothing.
- **Server-safe.** `trackEvent` is a no-op when there is no `window`, so shared
  components can call it during SSR without breaking the build.
- **Failure is silent for the visitor.** Analytics must never take a page down:
  storage errors are caught, and a missing container is not an error condition.
- **Removable.** Deleting `src/lib/analytics`, the banner and the six call sites
  would leave a working site. Keep it that way.
