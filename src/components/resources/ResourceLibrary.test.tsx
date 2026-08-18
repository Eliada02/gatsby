import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate } from 'gatsby';
import { axe } from 'jest-axe';
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
});

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
