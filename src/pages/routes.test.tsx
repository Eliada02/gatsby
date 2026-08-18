import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PRIMARY_NAV } from '@/lib/navigation';
import NotFoundPage from './404';
import AboutPage from './about';
import IndexPage from './index';
import PatientExperiencePage from './patient-experience';
import PlatformPage from './platform';
import ResourcesPage from './resources';
import SecurityPage from './security';

/**
 * Cross-cutting checks that apply to every route.
 *
 * Written once over all pages rather than repeated per page: these are
 * properties of the site, and a per-page copy would drift as pages are added.
 */

const ROUTES = [
  { name: 'Home', path: '/', Component: IndexPage },
  { name: 'Platform', path: '/platform', Component: PlatformPage },
  { name: 'Patient Experience', path: '/patient-experience', Component: PatientExperiencePage },
  { name: 'Resources', path: '/resources', Component: ResourcesPage },
  { name: 'Security & Trust', path: '/security', Component: SecurityPage },
  { name: 'About', path: '/about', Component: AboutPage },
  { name: 'Not found', path: null, Component: NotFoundPage },
] as const;

describe.each(ROUTES)('$name page', ({ Component }) => {
  it('has exactly one level-one heading', () => {
    // More than one h1, or none, leaves screen reader users without a reliable
    // statement of what the page is about.
    render(<Component />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders its heading inside the main landmark', () => {
    render(<Component />);

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Component />);

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
