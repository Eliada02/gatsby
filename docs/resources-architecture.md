# Resources architecture

How the resource library is put together, and why. Complements
[architecture.md](architecture.md), which covers the project as a whole.

---

## Data flow

Nothing in the UI reads content directly. The library goes through the API, and
the statically generated pages go through the build:

```
                    content/resources.json
                              │
                  src/lib/content/source.ts          ← the one content boundary
                              │
              ┌───────────────┴────────────────┐
       BUILD TIME                          RUNTIME
              │                                │
   gatsby-node.ts                    src/api/resources.ts   (Gatsby Function)
   · createPages → /resources/<slug>          │
   · onCreatePage → first page of            src/lib/content/resource-query.ts
     results into page context                │  (pure: filter, sort, paginate)
              │                                │
              │                        src/lib/api/client.ts     (fetch, errors)
              │                        src/lib/api/resources.ts  (typed calls)
              │                                │
              │                        src/hooks/useResources.ts (request state)
              └───────────────┬────────────────┘
                              │
                    ResourceLibrary + components
```

`resource-query.ts` is shared: the endpoint uses it at runtime and its tests use
it directly, so the filtering behaviour is exhaustively testable without a
server.

## Why a real endpoint

Filtering client-side would have been less code. It would also have meant
shipping the whole library to the browser and hiding most of it, and it would
demonstrate nothing about REST integration. Pagination is server-side for the
same reason: the browser receives one page.

`src/types/api.ts` is imported by both the handler and the client, so a change
to the response shape breaks compilation on both sides rather than failing at
runtime.

## Query parameters

The URL is the public contract:

```
/resources?search=patient&category=digital-health&sort=newest&page=2
```

| Parameter  | Values                          | Notes                      |
| ---------- | ------------------------------- | -------------------------- |
| `search`   | free text                       | maps to the endpoint's `q` |
| `category` | one of `RESOURCE_CATEGORIES`    | omitted means all          |
| `sort`     | `newest` \| `oldest` \| `title` | `newest` is the default    |
| `page`     | integer ≥ 2                     | page 1 is never written    |

Defaults are omitted when building URLs, so the canonical library URL stays
`/resources` rather than accumulating `?sort=newest&page=1`.

The URL name `search` differs from the API name `q` on purpose: the URL is read
by people, the API by code. `src/lib/resources/query-params.ts` is the only
module that knows about the mapping.

### Validation happens at both boundaries, differently

- **Client** (`parseResourceQuery`) drops values it does not recognise. The URL
  is user-editable, and a hand-typed category should show the whole library
  rather than an error page.
- **Server** (`src/api/resources.ts`) rejects them with `400`. Silently ignoring
  a filter would return results that contradict the request.

Neither trusts the other. They differ because the consequences differ.

## URL as the source of truth

No component holds a copy of the filter state. The URL is parsed into a query,
the query is fetched, the response is rendered; changing a control writes a new
URL and the cycle repeats. Refresh, deep links, and browser back and forward
work because there is nothing to keep in sync.

**The one exception is the search input.** Rewriting the URL on every keystroke
would push a history entry per character and make the back button useless, so
the field holds local state and pushes after a 300 ms pause. That is a second
copy of one value, so the reconciliation is explicit: `ResourceSearch` records
the term it last sent upward, and adopts any incoming value that differs —
which is what makes browser back and the empty-state reset move the field.

## Request state

A discriminated union, as recorded in `architecture.md`:

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };
```

Three booleans would allow `{ isLoading: true, error }`. The union makes that
unrepresentable and forces the UI to handle every branch, including success with
zero results, so the empty state cannot be forgotten.

Two behaviours worth knowing:

- **In-flight requests are aborted when the query changes.** Typing produces
  overlapping requests, and without cancellation a slow early response can
  arrive after a fast later one and overwrite correct results. An `aborted`
  error is swallowed rather than shown: the reader superseded it themselves.
- **Results stay on screen while refetching.** Collapsing to a skeleton on every
  keystroke makes the page flicker; `isRefreshing` dims the list instead.

## Static rendering

`onCreatePage` injects the unfiltered first page into the page context, so the
served HTML contains real cards rather than a skeleton. Crawlers and readers
without JavaScript get content; returning visitors see no loading flash.

The payload is tagged with the request path it corresponds to, so `useResources`
can tell whether it applies to the current query rather than assuming it does. A
URL with filters fetches immediately.

Detail pages are generated by `createPages` straight from the content source.
The endpoint does not exist during a build, and going over HTTP to reach data
already in memory would be indirection with no benefit.

## Accessibility decisions

| Decision                                        | Reason                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Native `<select>` for category and sort         | Arrow keys, type-ahead and the mobile picker come from the platform         |
| Visible labels, not placeholders                | A placeholder disappears once the field has content                         |
| Pagination as links, not buttons                | Each page has a real URL; links open in new tabs and announce as navigation |
| Unavailable direction is inert text             | `aria-disabled` leaves an anchor focusable and followable                   |
| One live region for the whole library           | The skeleton had its own, which competed with the result count              |
| Result count announcement debounced 500 ms      | Announcing per keystroke interrupts a screen reader continuously            |
| Error uses `role="alert"`                       | Assertive: a failure should interrupt                                       |
| Skeleton is `aria-hidden`                       | Reading out a dozen placeholders conveys nothing                            |
| Skeleton animation removed under reduced motion | The global rule collapses duration, which would freeze an infinite pulse    |
| Stretched link on cards                         | Whole card clickable, but one link with the title as its accessible name    |
| `headingLevel` prop on `ResourceCard`           | h3 in the library, h3 under "More on …"; hard-coding breaks one of them     |

## Known limitations

- **Keyboard stepping of a range input and native `select` popups cannot be
  verified in jsdom.** Those tests assert what jsdom can observe and the rest is
  checked manually; the test files say so rather than implying more coverage
  than exists.
- **`?page=99` is clamped rather than rejected**, so the URL can briefly
  disagree with the page shown. Pagination reads `meta.page` from the response,
  so the controls stay coherent and the next interaction corrects the URL.
- **Search is substring matching over title, summary and tags.** No stemming, no
  ranking, no fuzzy matching. At fourteen entries anything more would be
  unjustified.
- **The endpoint requires a host that runs Gatsby Functions** (Netlify). On a
  purely static host the client would need to point at generated JSON instead;
  `GATSBY_API_BASE_URL` and `getResourcesByPath` are the seam for that.
