import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { queryResources } from '@/lib/content/resource-query';
import { resources } from '@/lib/content/source';
import { FOOTER_NAV, PRIMARY_NAV } from '@/lib/navigation';
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

  it('places every heading in order, with no level skipped', () => {
    // A jump from h1 to h3 is invisible on screen and breaks navigation for
    // anyone moving through a page by heading, which is how most screen reader
    // users read an unfamiliar page.
    render(renderPage());

    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.substring(1)));

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('provides one banner, one main and one contentinfo', () => {
    // Duplicated landmarks make a screen reader's landmark list unusable, and
    // several of the heading ids here are module constants — rendering a
    // section twice on one page is the way that happens.
    render(renderPage());

    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('gives every region an accessible name', () => {
    // A <section> is only exposed as a landmark once it has a name; an unnamed
    // one is announced as "region" and helps nobody.
    render(renderPage());

    for (const region of screen.queryAllByRole('region')) {
      expect(region).toHaveAccessibleName();
    }
  });

  it('uses each element id only once', () => {
    // Section heading ids are module-level constants, so a duplicate is one
    // careless reuse away. aria-labelledby then resolves to the first match and
    // a landmark silently takes the wrong name.
    const { container } = render(renderPage());

    const ids = Array.from(container.querySelectorAll('[id]')).map((element) => element.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no interactive element without an accessible name', () => {
    // An unnamed control is announced as "button" or "link" and nothing else.
    render(renderPage());

    for (const element of [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')]) {
      expect(element).toHaveAccessibleName();
    }
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

  it('gives no two links the same name and a different destination', () => {
    /*
     * A screen reader's link list shows names without the heading they sit
     * under, so two entries reading "Patient experience" that lead to different
     * pages are indistinguishable there. This is the check that keeps the
     * footer's resource shortcuts named for what they actually open.
     */
    const destinationsByLabel = new Map<string, Set<string>>();

    for (const item of [...PRIMARY_NAV, ...FOOTER_NAV.flatMap((group) => group.items)]) {
      const key = item.label.trim().toLowerCase();
      const destinations = destinationsByLabel.get(key) ?? new Set<string>();
      destinations.add(item.to);
      destinationsByLabel.set(key, destinations);
    }

    const ambiguous = [...destinationsByLabel.entries()]
      .filter(([, destinations]) => destinations.size > 1)
      .map(([label, destinations]) => `${label} → ${[...destinations].join(', ')}`);

    expect(ambiguous).toEqual([]);
  });
});
