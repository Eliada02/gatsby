import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate } from 'gatsby';
import { axe } from 'jest-axe';
import { setConsent } from '@/lib/analytics/consent';
import { resetPendingEvents } from '@/lib/analytics/dataLayer';
import { queryResources } from '@/lib/content/resource-query';
import { resources } from '@/lib/content/source';
import type { ResourceListResponse } from '@/types/api';
import { ResourceLibrary } from './ResourceLibrary';

/**
 * Behaviour of the resource library.
 *
 * fetch is mocked at the network boundary so the client, the request-state
 * machine and the rendering all run for real; only the server is simulated.
 *
 * navigate is the gatsby mock's jest.fn. Because it does not actually change
 * the location, URL synchronisation is asserted by checking the URL the
 * component asks for, and the resulting view is asserted by rendering with that
 * search string. That split mirrors how the router really works: the component
 * requests a URL, the router supplies one back.
 */

const mockNavigate = navigate as unknown as jest.Mock;
const mockFetch = jest.fn();

const respondWith = (body: unknown, status = 200) => {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
};

/** Serves real query results, so the component sees what the API would return. */
const respondFromContent = () => {
  mockFetch.mockImplementation((url: string) => {
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const page = Number(params.get('page'));
    const result = queryResources(resources, {
      q: params.get('q') ?? undefined,
      category: (params.get('category') as never) ?? undefined,
      sort: (params.get('sort') as never) ?? undefined,
      page: Number.isFinite(page) && page > 0 ? page : undefined,
    });
    return Promise.resolve({ ok: true, status: 200, json: async () => result } as Response);
  });
};

const firstPage = (): ResourceListResponse => queryResources(resources);

beforeEach(() => {
  mockFetch.mockReset();
  mockNavigate.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  window.localStorage.clear();
  window.dataLayer = [];
  resetPendingEvents();
});

const dataLayer = () => window.dataLayer ?? [];
const eventsNamed = (name: string) =>
  dataLayer().filter((entry) => (entry as { event: string }).event === name);

describe('ResourceLibrary', () => {
  describe('initial render', () => {
    it('shows results supplied at build time without a network request', () => {
      // The static build injects the first page. Fetching it again on mount
      // would throw away the point of rendering it into the HTML.
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      expect(screen.getAllByRole('article').length).toBe(firstPage().data.length);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches when the URL carries filters the build-time payload cannot cover', async () => {
      respondFromContent();
      render(<ResourceLibrary search="?category=interoperability" initialData={firstPage()} />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(String(mockFetch.mock.calls[0]?.[0])).toContain('category=interoperability');
    });
  });

  describe('request states', () => {
    it('announces loading while the first request is in flight', () => {
      mockFetch.mockReturnValue(new Promise(() => {}));
      render(<ResourceLibrary search="?category=digital-health" />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading resources/i);
    });

    it('renders results on success', async () => {
      respondFromContent();
      render(<ResourceLibrary search="" />);

      await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
      expect(screen.getByText(/showing \d+ of \d+ resources/i)).toBeInTheDocument();
    });

    it('renders an error with a retry action when the request fails', async () => {
      respondWith({ code: 'boom', message: 'nope' }, 500);
      render(<ResourceLibrary search="" />);

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByRole('heading')).toHaveTextContent(/could not load/i);
      expect(within(alert).getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not expose status codes or URLs in the error message', async () => {
      respondWith({ code: 'boom', message: 'nope' }, 500);
      render(<ResourceLibrary search="" />);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).not.toMatch(/500|\/api\/|fetch/i);
    });

    it('refetches when retry is pressed', async () => {
      const user = userEvent.setup();
      respondWith({ code: 'boom', message: 'nope' }, 500);
      render(<ResourceLibrary search="" />);

      await screen.findByRole('alert');
      respondFromContent();
      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    });

    it('offers a way back rather than a retry when the request itself was invalid', async () => {
      // Repeating a request the server rejected as malformed just fails again.
      respondWith({ code: 'invalid_category', message: 'Unknown category' }, 400);
      render(<ResourceLibrary search="" />);

      const alert = await screen.findByRole('alert');
      expect(within(alert).queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(within(alert).getByRole('link', { name: /all resources/i })).toBeInTheDocument();
    });

    it('explains an empty search and offers to clear it', async () => {
      respondWith({ data: [], meta: { total: 0, page: 1, pageSize: 6, totalPages: 1 } });
      render(<ResourceLibrary search="?search=zzzznothing" />);

      expect(await screen.findByText(/no resources match/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search and filters/i })).toBeInTheDocument();
    });

    it('distinguishes an empty library from an empty search', async () => {
      // Different causes need different actions: one the reader can fix.
      respondWith({ data: [], meta: { total: 0, page: 1, pageSize: 6, totalPages: 1 } });
      render(<ResourceLibrary search="" />);

      expect(await screen.findByText(/no resources published yet/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /clear search and filters/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('URL synchronisation', () => {
    it('writes a debounced search term to the URL', async () => {
      const user = userEvent.setup();
      respondFromContent();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      await user.type(screen.getByLabelText(/search resources/i), 'audit');

      // Not once per keystroke: that would push five history entries and make
      // the back button useless.
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(mockNavigate).toHaveBeenCalledWith('/resources?search=audit');
    });

    it('writes the selected category to the URL', async () => {
      const user = userEvent.setup();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      await user.selectOptions(screen.getByLabelText(/category/i), 'interoperability');

      expect(mockNavigate).toHaveBeenCalledWith('/resources?category=interoperability');
    });

    it('writes the sort order to the URL, omitting the default', async () => {
      const user = userEvent.setup();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'oldest');
      expect(mockNavigate).toHaveBeenCalledWith('/resources?sort=oldest');

      await user.selectOptions(screen.getByLabelText(/sort by/i), 'newest');
      expect(mockNavigate).toHaveBeenLastCalledWith('/resources');
    });

    it('returns to page one when a filter changes', async () => {
      const user = userEvent.setup();
      respondFromContent();
      render(<ResourceLibrary search="?page=2" />);

      await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
      await user.selectOptions(screen.getByLabelText(/category/i), 'digital-health');

      // Staying on page 2 of a shorter result set usually shows an empty grid
      // for a filter that actually matched.
      expect(mockNavigate).toHaveBeenCalledWith('/resources?category=digital-health');
    });

    it('restores the full view from the URL alone', async () => {
      respondFromContent();
      render(
        <ResourceLibrary search="?search=access&category=security-privacy&sort=oldest&page=1" />,
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      // This is what makes refresh, deep links and browser history work: no
      // state is held anywhere except the URL.
      expect(screen.getByLabelText(/search resources/i)).toHaveValue('access');
      expect(screen.getByLabelText(/category/i)).toHaveValue('security-privacy');
      expect(screen.getByLabelText(/sort by/i)).toHaveValue('oldest');
    });

    it('adopts a term that changed outside the search field', async () => {
      // Browser back, or the empty state's reset. The field holds local state
      // for debouncing, so it has to notice when the URL moves under it.
      respondFromContent();
      const { rerender } = render(<ResourceLibrary search="?search=audit" />);

      expect(screen.getByLabelText(/search resources/i)).toHaveValue('audit');

      rerender(<ResourceLibrary search="" />);

      await waitFor(() => expect(screen.getByLabelText(/search resources/i)).toHaveValue(''));
    });

    it('clears the search field and the URL from the clear button', async () => {
      const user = userEvent.setup();
      respondFromContent();
      render(<ResourceLibrary search="?search=audit" />);

      await user.click(screen.getByRole('button', { name: /clear search/i }));

      expect(screen.getByLabelText(/search resources/i)).toHaveValue('');
      expect(mockNavigate).toHaveBeenCalledWith('/resources');
    });
  });

  describe('pagination', () => {
    it('links to the next page and omits previous on page one', async () => {
      respondFromContent();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      const pager = screen.getByRole('navigation', { name: /resource library pages/i });
      expect(within(pager).getByRole('link', { name: /next page, page 2/i })).toHaveAttribute(
        'href',
        '/resources?page=2',
      );
      // There is no such thing as a disabled link, so the unavailable direction
      // is not rendered as one.
      expect(within(pager).queryByRole('link', { name: /previous page/i })).not.toBeInTheDocument();
    });

    it('carries the active filters into the page links', async () => {
      // A crafted response rather than real content, so the assertion does not
      // depend on how many seeded resources happen to match the term.
      respondWith({
        data: queryResources(resources).data,
        meta: { total: 20, page: 2, pageSize: 6, totalPages: 4 },
      });
      render(<ResourceLibrary search="?search=care&category=digital-health&page=2" />);

      const pager = await screen.findByRole('navigation', { name: /resource library pages/i });

      // Losing the filters when paging is the classic pagination defect: page 3
      // would silently show the unfiltered library.
      for (const name of [/previous page/i, /next page/i]) {
        const link = within(pager).getByRole('link', { name });
        expect(link).toHaveAttribute('href', expect.stringContaining('search=care'));
        expect(link).toHaveAttribute('href', expect.stringContaining('category=digital-health'));
      }
      expect(within(pager).getByRole('link', { name: /previous page, page 1/i })).toHaveAttribute(
        'href',
        expect.not.stringContaining('page='),
      );
      expect(within(pager).getByRole('link', { name: /next page, page 3/i })).toHaveAttribute(
        'href',
        expect.stringContaining('page=3'),
      );
    });

    it('states the current page for screen readers', async () => {
      respondFromContent();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      const pager = screen.getByRole('navigation', { name: /resource library pages/i });
      expect(pager).toHaveTextContent(/page 1 of \d+/i);
      expect(pager).toHaveTextContent(/\d+ resources in total/i);
    });
  });

  describe('accessibility', () => {
    it('announces the result count in a single live region', async () => {
      respondFromContent();
      render(<ResourceLibrary search="" initialData={firstPage()} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/\d+ resources found/i);
      });
      // Two live regions would announce the same change twice.
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });

    it('has no violations with results on screen', async () => {
      respondFromContent();
      const { container } = render(<ResourceLibrary search="" initialData={firstPage()} />);

      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations in the error state', async () => {
      respondWith({ code: 'boom', message: 'nope' }, 500);
      const { container } = render(<ResourceLibrary search="" />);

      await screen.findByRole('alert');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations in the empty state', async () => {
      respondWith({ data: [], meta: { total: 0, page: 1, pageSize: 6, totalPages: 1 } });
      const { container } = render(<ResourceLibrary search="?search=none" />);

      await screen.findByText(/no resources match/i);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

/**
 * Library analytics.
 *
 * Search and filter events both carry the number of results, which does not
 * exist at the moment of the interaction. They are emitted when the results
 * arrive, so these assertions are as much about what is *not* recorded —
 * keystrokes, deep links, a cleared field — as about what is.
 *
 * navigate is mocked, so the router's half of the cycle is performed by
 * re-rendering with the search string the component asked for.
 */
describe('analytics', () => {
  it('records one resource_search for a settled term, with its result count', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.type(screen.getByLabelText(/search resources/i), 'access');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/resources?search=access'));

    rerender(<ResourceLibrary search="?search=access" />);
    await waitFor(() => expect(eventsNamed('resource_search')).toHaveLength(1));

    expect(eventsNamed('resource_search')[0]).toEqual({
      event: 'resource_search',
      search_term: 'access',
      results_count: queryResources(resources, { q: 'access' }).meta.total,
    });
  });

  it('does not record a search per keystroke', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.type(screen.getByLabelText(/search resources/i), 'audit');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));

    rerender(<ResourceLibrary search="?search=audit" />);
    await waitFor(() => expect(eventsNamed('resource_search')).toHaveLength(1));

    // Five characters, one event.
    expect(eventsNamed('resource_search')).toHaveLength(1);
  });

  it('records a zero-result search rather than skipping it', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.type(screen.getByLabelText(/search resources/i), 'zzzznothing');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

    rerender(<ResourceLibrary search="?search=zzzznothing" />);

    // Searches that find nothing are the most useful ones in the report.
    await waitFor(() =>
      expect(eventsNamed('resource_search')[0]).toMatchObject({ results_count: 0 }),
    );
  });

  it('does not record a search for a page arrived at from a shared link', async () => {
    // The filters were already in the URL. Counting that as a search would
    // report every visit to a bookmarked query as a fresh one.
    setConsent('granted');
    respondFromContent();
    render(<ResourceLibrary search="?search=access" />);

    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    expect(eventsNamed('resource_search')).toHaveLength(0);
  });

  it('does not record clearing the search field as a search', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="?search=audit" />);

    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    rerender(<ResourceLibrary search="" />);

    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    expect(eventsNamed('resource_search')).toHaveLength(0);
  });

  it('records a category filter with the count it produced', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.selectOptions(screen.getByLabelText(/category/i), 'interoperability');
    rerender(<ResourceLibrary search="?category=interoperability" />);

    await waitFor(() => expect(eventsNamed('resource_filter')).toHaveLength(1));
    expect(eventsNamed('resource_filter')[0]).toEqual({
      event: 'resource_filter',
      filter_type: 'category',
      filter_value: 'interoperability',
      results_count: queryResources(resources, { category: 'interoperability' }).meta.total,
    });
  });

  it('records the sort order as a filter change', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'oldest');
    rerender(<ResourceLibrary search="?sort=oldest" />);

    await waitFor(() => expect(eventsNamed('resource_filter')).toHaveLength(1));
    expect(eventsNamed('resource_filter')[0]).toMatchObject({
      filter_type: 'sort',
      filter_value: 'oldest',
    });
  });

  it('records clearing the category as a filter change to all', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="?category=interoperability" />);

    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));
    await user.selectOptions(screen.getByLabelText(/category/i), '');
    rerender(<ResourceLibrary search="" />);

    await waitFor(() => expect(eventsNamed('resource_filter')).toHaveLength(1));
    expect(eventsNamed('resource_filter')[0]).toMatchObject({ filter_value: 'all' });
  });

  it('drops the pending interaction when the request fails', async () => {
    // Attaching it to whatever loads next would report a count that was never
    // on screen for that interaction.
    const user = userEvent.setup();
    setConsent('granted');
    respondWith({ code: 'boom', message: 'nope' }, 500);
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.selectOptions(screen.getByLabelText(/category/i), 'interoperability');
    rerender(<ResourceLibrary search="?category=interoperability" />);
    await screen.findByRole('alert');

    respondFromContent();
    rerender(<ResourceLibrary search="" />);
    await waitFor(() => expect(screen.getAllByRole('article').length).toBeGreaterThan(0));

    expect(eventsNamed('resource_filter')).toHaveLength(0);
  });

  it('records resource_open with the position of the card that was opened', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(<ResourceLibrary search="" initialData={firstPage()} />);

    const second = firstPage().data[1]!;
    await user.click(screen.getByRole('link', { name: second.title }));

    expect(eventsNamed('resource_open')).toHaveLength(1);
    expect(eventsNamed('resource_open')[0]).toEqual({
      event: 'resource_open',
      resource_id: second.id,
      resource_title: second.title,
      resource_category: second.category,
      list_position: 2,
    });
  });

  it('records nothing at all while consent is withheld', async () => {
    const user = userEvent.setup();
    setConsent('denied');
    respondFromContent();
    const { rerender } = render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.selectOptions(screen.getByLabelText(/category/i), 'interoperability');
    rerender(<ResourceLibrary search="?category=interoperability" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await user.click(screen.getAllByRole('article')[0]!.querySelector('a')!);

    expect(dataLayer()).toHaveLength(0);
  });
});

/**
 * Keyboard and screen reader behaviour of the library controls.
 *
 * The library is the one part of the site that changes its own content in
 * place, so these are the assertions that a change is perceivable to someone
 * who cannot see the grid redraw.
 */
describe('keyboard and announcements', () => {
  it('reaches search, filters and results in the order they are read', async () => {
    const user = userEvent.setup();
    respondFromContent();
    render(<ResourceLibrary search="" initialData={firstPage()} />);

    await user.tab();
    expect(screen.getByLabelText(/search resources/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/category/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/sort by/i)).toHaveFocus();

    await user.tab();
    // The first result, rather than anything between the toolbar and the grid.
    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: firstPage().data[0]!.title }),
    );
  });

  it('uses native controls, so filtering works with the keyboard alone', async () => {
    // Native selects rather than a custom listbox: arrow keys, type-ahead,
    // Escape and the mobile picker all come for free, and none of them can
    // regress. The URL is the state, so the assertion is on what the control
    // asks the router for.
    const user = userEvent.setup();
    respondFromContent();
    render(<ResourceLibrary search="" initialData={firstPage()} />);

    const category = screen.getByLabelText(/category/i);
    expect(category.tagName).toBe('SELECT');
    expect(screen.getByLabelText(/sort by/i).tagName).toBe('SELECT');

    await user.selectOptions(category, 'interoperability');
    expect(mockNavigate).toHaveBeenCalledWith('/resources?category=interoperability');
  });

  it('announces the result count through one polite region', async () => {
    respondFromContent();
    render(<ResourceLibrary search="" initialData={firstPage()} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/\d+ resources found/i);
    });
    // Two regions would announce the same change twice; a whole page marked
    // live would announce everything.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('interrupts with an alert when loading fails, rather than politely', async () => {
    // A failure the reader has to act on is the one case where interrupting is
    // correct.
    respondWith({ code: 'boom', message: 'nope' }, 500);
    render(<ResourceLibrary search="" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not load/i);
    // The polite region empties, so the two never talk over each other.
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
  });

  it('hides the loading placeholders from screen readers', async () => {
    // A dozen empty skeleton cards read aloud tell the user nothing; the live
    // region says "Loading resources" instead.
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ResourceLibrary search="?category=digital-health" />);

    const skeleton = container.querySelector('[aria-hidden="true"] ');
    expect(skeleton ?? container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/loading resources/i);
  });

  it('keeps the empty state usable by keyboard', async () => {
    const user = userEvent.setup();
    respondWith({ data: [], meta: { total: 0, page: 1, pageSize: 6, totalPages: 1 } });
    render(<ResourceLibrary search="?search=zzzznothing" />);

    const reset = await screen.findByRole('button', { name: /clear search and filters/i });
    reset.focus();
    await user.keyboard('{Enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/resources');
  });

  it('names each pagination control by the page it opens', async () => {
    respondWith({
      data: queryResources(resources).data,
      meta: { total: 20, page: 2, pageSize: 6, totalPages: 4 },
    });
    render(<ResourceLibrary search="?page=2" />);

    const pager = await screen.findByRole('navigation', { name: /resource library pages/i });
    // "Previous"/"Next" alone are ambiguous in a screen reader's link list.
    expect(within(pager).getByRole('link', { name: /previous page, page 1/i })).toBeInTheDocument();
    expect(within(pager).getByRole('link', { name: /next page, page 3/i })).toBeInTheDocument();
  });
});
