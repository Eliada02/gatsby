import { navigate } from 'gatsby';
import { useCallback, useMemo } from 'react';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useResources } from '@/hooks/useResources';
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

  const handleSearchChange = useCallback((term: string) => updateQuery({ q: term }), [updateQuery]);
  const handleCategoryChange = useCallback(
    (category: ResourceCategory | undefined) => updateQuery({ category }),
    [updateQuery],
  );
  const handleSortChange = useCallback(
    (sort: ResourceSort) => updateQuery({ sort }),
    [updateQuery],
  );

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
