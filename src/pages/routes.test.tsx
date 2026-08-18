import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { queryResources } from '@/lib/content/resource-query';
import { resources } from '@/lib/content/source';
import { PRIMARY_NAV } from '@/lib/navigation';
import { makePageProps } from '@/test-utils/page-props';
import NotFoundPage from './404';
import AboutPage from './about';
import IndexPage from './index';
import PatientExperiencePage from './patient-experience';
import PlatformPage from './platform';
import ResourcesPage from './resources';
import type { ResourcesPageContext } from './resources';
import SecurityPage from './security';

/**
 * Cross-cutting checks that apply to every route.
 *
 * Written once over all pages rather than repeated per page: these are
 * properties of the site, and a per-page copy would drift as pages are added.
 *
 * Each route supplies its own render, because pages no longer take a uniform
 * set of props: the resource library needs a location and page context.
 */

const ROUTES: ReadonlyArray<{ name: string; path: string | null; render: () => ReactElement }> = [
  { name: 'Home', path: '/', render: () => <IndexPage /> },
  { name: 'Platform', path: '/platform', render: () => <PlatformPage /> },
  {
    name: 'Patient Experience',
    path: '/patient-experience',
    render: () => <PatientExperiencePage />,
  },
  {
    name: 'Resources',
    path: '/resources',
    // Given the build-time payload so the page renders results without a
    // network request, exactly as the static build does.
    render: () => (
      <ResourcesPage
        {...makePageProps<object, ResourcesPageContext>({
          pageContext: { initialResources: queryResources(resources) },
        })}
      />
    ),
  },
  { name: 'Security & Trust', path: '/security', render: () => <SecurityPage /> },
  { name: 'About', path: '/about', render: () => <AboutPage /> },
  { name: 'Not found', path: null, render: () => <NotFoundPage /> },
];

describe.each(ROUTES)('$name page', ({ render: renderPage }) => {
  it('has exactly one level-one heading', () => {
    // More than one h1, or none, leaves screen reader users without a reliable
    // statement of what the page is about.
    render(renderPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders its heading inside the main landmark', () => {
    render(renderPage());

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(renderPage());

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('site navigation', () => {
  it('links every primary destination to a route that exists', () => {
    // Guards the most common navigation defect: a nav entry pointing at a page
    // that was renamed or never built, which only shows as a 404 in production.
    const builtRoutes = new Set<string>();
    for (const route of ROUTES) {
      if (route.path !== null) builtRoutes.add(route.path);
    }

    for (const item of PRIMARY_NAV) {
      expect(builtRoutes.has(item.to)).toBe(true);
    }
  });
});
