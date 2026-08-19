import { navigate } from 'gatsby';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useResources } from '@/hooks/useResources';
import { trackResourceFilter, trackResourceSearch } from '@/lib/analytics/track';
import { buildResourcesPath } from '@/lib/api/resources';
import {
  DEFAULT_RESOURCE_SORT,
  RESOURCES_PATH,
  applyQueryPatch,
  buildResourceSearch,
  isDefaultQuery,
  parseResourceQuery,
} from '@/lib/resources/query-params';
import type { ResourceListResponse, ResourceQuery, ResourceSort } from '@/types/api';
import type { ResourceCategory } from '@/types/content';
import { ResourceFilters } from './ResourceFilters';
import { ResourceGrid } from './ResourceGrid';
import { ResourcePagination } from './ResourcePagination';
import { ResourceSearch } from './ResourceSearch';
import { ResourceEmpty, ResourceError, ResourceLoading } from './ResourceStates';
import * as controlStyles from './ResourceControls.module.css';
import * as styles from './ResourceLibrary.module.css';

const HEADING_ID = 'resource-library-heading';
const ANNOUNCE_DELAY_MS = 500;

/** Value recorded for `filter_value` when the category filter is cleared. */
const ALL_CATEGORIES = 'all';

/**
 * An interaction that has been made but not yet measured.
 *
 * `resource_search` and `resource_filter` both carry a results count, and that
 * count does not exist at the moment of the interaction — the URL has only just
 * changed and the request has not returned. So the interaction is recorded here
 * and the event is emitted once its results arrive, which also means the
 * measurement describes what the reader actually saw.
 */
type PendingInteraction =
  { kind: 'search'; term: string } | { kind: 'filter'; type: 'category' | 'sort'; value: string };

interface ResourceLibraryProps {
  /** location.search, owned by the router. The single source of filter state. */
  search: string;
  /** First page rendered at build time, so the static HTML is not empty. */
  initialData?: ResourceListResponse;
}

/**
 * The resource library.
 *
 * State flows in one direction: the URL is parsed into a query, the query is
 * fetched, the response is rendered. Changing a control writes a new URL and
 * the cycle repeats. Nothing keeps a second copy of the filters, which is why
 * refresh, deep links and browser back and forward all work without any code
 * dedicated to them.
 */
export function ResourceLibrary({ search, initialData }: ResourceLibraryProps) {
  const query = useMemo(() => parseResourceQuery(search), [search]);

  /*
   * The build-time payload is only valid for the unfiltered first page. Tagging
   * it with the request path it corresponds to means the hook can tell whether
   * it applies rather than assuming it does.
   */
  const initial = useMemo(
    () => (initialData ? { key: buildResourcesPath({}), data: initialData } : undefined),
    [initialData],
  );

  const { state, retry, isRefreshing } = useResources(query, initial);

  const updateQuery = useCallback(
    (patch: Partial<ResourceQuery>) => {
      const next = applyQueryPatch(query, patch);
      void navigate(`${RESOURCES_PATH}${buildResourceSearch(next)}`);
    },
    [query],
  );

  const resetFilters = useCallback(() => {
    void navigate(RESOURCES_PATH);
  }, []);

  /*
   * Analytics intent, not analytics state: nothing renders from this, so a ref
   * avoids a render pass per interaction.
   */
  const pendingInteraction = useRef<PendingInteraction | null>(null);

  const handleSearchChange = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      /*
       * The search field debounces, so this runs once the reader stops typing
       * rather than once per keystroke. Clearing the field is not a search and
       * is deliberately not recorded as one.
       */
      pendingInteraction.current = trimmed === '' ? null : { kind: 'search', term: trimmed };
      updateQuery({ q: term });
    },
    [updateQuery],
  );

  const handleCategoryChange = useCallback(
    (category: ResourceCategory | undefined) => {
      pendingInteraction.current = {
        kind: 'filter',
        type: 'category',
        value: category ?? ALL_CATEGORIES,
      };
      updateQuery({ category });
    },
    [updateQuery],
  );

  const handleSortChange = useCallback(
    (sort: ResourceSort) => {
      pendingInteraction.current = { kind: 'filter', type: 'sort', value: sort };
      updateQuery({ sort });
    },
    [updateQuery],
  );

  /*
   * Emits the event for the interaction above once its results land.
   *
   * Only interactions are measured. A page loaded from a shared link already
   * carries filters in the URL, and counting that as a search would report
   * every visit to a bookmarked query as a fresh one.
   *
   * A failed request drops the pending interaction rather than holding it: the
   * next successful response belongs to a different query, and attaching the
   * old interaction to it would report a count that was never on screen.
   */
  useEffect(() => {
    if (state.status === 'error') {
      pendingInteraction.current = null;
      return;
    }
    if (state.status !== 'success') return;

    const interaction = pendingInteraction.current;
    if (!interaction) return;
    pendingInteraction.current = null;

    const resultsCount = state.data.meta.total;

    if (interaction.kind === 'search') {
      trackResourceSearch(interaction.term, resultsCount);
    } else {
      trackResourceFilter(interaction.type, interaction.value, resultsCount);
    }
  }, [state]);

  /*
   * One live region describes the whole library: loading, then the result
   * count. Two regions - one in the skeleton and one for the count - would
   * announce competing messages during the same update.
   *
   * Debounced for the same reason as the impact calculator: a region that fires
   * on every keystroke interrupts a screen reader continuously while someone is
   * still typing. It also means a fast response never announces "loading" at
   * all, which is the desirable outcome.
   *
   * Failures are not included here; they are announced by the error state's
   * role="alert", which is assertive and interrupts, as a failure should.
   */
  const statusText =
    state.status === 'loading' || state.status === 'idle'
      ? 'Loading resources'
      : state.status === 'success'
        ? `${state.data.meta.total} ${state.data.meta.total === 1 ? 'resource' : 'resources'} found`
        : '';
  const announcedSummary = useDebouncedValue(statusText, ANNOUNCE_DELAY_MS);

  return (
    <Section tone="canvas" aria-labelledby={HEADING_ID}>
      <Container>
        <h2 id={HEADING_ID} className="nh-visually-hidden">
          Browse the resource library
        </h2>

        <div className={controlStyles.toolbar}>
          <ResourceSearch value={query.q ?? ''} onChange={handleSearchChange} />
          <ResourceFilters
            category={query.category}
            sort={query.sort ?? DEFAULT_RESOURCE_SORT}
            onCategoryChange={handleCategoryChange}
            onSortChange={handleSortChange}
          />
        </div>

        {/*
         * One polite live region for the result count, kept out of the visual
         * layout. The visible count below is a plain paragraph so the number is
         * not announced twice.
         */}
        <p className="nh-visually-hidden" role="status" aria-atomic="true">
          {announcedSummary}
        </p>

        <div className={styles.results}>
          {state.status === 'success' && (
            <p className={styles.count}>
              {state.data.meta.total === 0
                ? 'No resources found'
                : `Showing ${state.data.data.length} of ${state.data.meta.total} resources`}
            </p>
          )}

          {(state.status === 'idle' || state.status === 'loading') && <ResourceLoading />}

          {state.status === 'error' && <ResourceError error={state.error} onRetry={retry} />}

          {state.status === 'success' &&
            (state.data.data.length === 0 ? (
              <ResourceEmpty
                searchTerm={query.q}
                hasFilters={!isDefaultQuery(query)}
                onReset={resetFilters}
              />
            ) : (
              <>
                <ResourceGrid resources={state.data.data} isRefreshing={isRefreshing} />
                <ResourcePagination meta={state.data.meta} query={query} />
              </>
            ))}
        </div>
      </Container>
    </Section>
  );
}
