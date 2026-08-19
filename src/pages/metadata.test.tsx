import { render } from '@testing-library/react';
import { useStaticQuery } from 'gatsby';
import type { PageProps } from 'gatsby';
import type { ReactElement } from 'react';
import { resources } from '@/lib/content/source';
import { makePageProps } from '@/test-utils/page-props';
import { Head as NotFoundHead } from './404';
import { Head as AboutHead } from './about';
import { Head as HomeHead } from './index';
import { Head as PatientExperienceHead } from './patient-experience';
import { Head as PlatformHead } from './platform';
import { Head as ResourcesHead } from './resources';
import { Head as SecurityHead } from './security';
import { Head as ResourceDetailHead } from '../templates/ResourceDetail';
import type { ResourceDetailContext } from '../templates/ResourceDetail';

/**
 * Per-page metadata.
 *
 * Head exports render like any other component, so what a crawler would receive
 * is asserted directly. The point of doing it per route is the failure this
 * catches: a page shipped with the site-wide description, or with the canonical
 * of whichever page it was copied from.
 */

const mockStaticQuery = useStaticQuery as unknown as jest.Mock;

const SITE_URL = 'https://novahealth.example';

const SITE_METADATA = {
  title: 'NovaHealth',
  titleTemplate: '%s | NovaHealth',
  description: 'Site-wide fallback description.',
  siteUrl: SITE_URL,
  locale: 'en',
  organization: {
    name: 'NovaHealth',
    legalName: 'NovaHealth Therapeutics',
    tagline: 'Advancing science. Improving lives.',
  },
  socialImage: '/og-image.png',
  socialImageAlt: 'NovaHealth social card',
};

beforeEach(() => {
  mockStaticQuery.mockReset();
  mockStaticQuery.mockReturnValue({ site: { siteMetadata: SITE_METADATA } });
});

interface RenderedHead {
  title: string | undefined;
  description: string | undefined;
  canonical: string | undefined;
  robots: string | undefined;
  ogType: string | undefined;
  jsonLd: Record<string, unknown> | undefined;
  metaAll: (selector: string) => string[];
}

function renderHead(element: ReactElement): RenderedHead {
  const { container } = render(element);
  const content = (selector: string) =>
    container.querySelector(selector)?.getAttribute('content') ?? undefined;
  const script = container.querySelector('script[type="application/ld+json"]');

  return {
    title: container.querySelector('title')?.textContent ?? undefined,
    description: content('meta[name="description"]'),
    canonical: container.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? undefined,
    robots: content('meta[name="robots"]'),
    ogType: content('meta[property="og:type"]'),
    jsonLd: script ? (JSON.parse(script.innerHTML) as Record<string, unknown>) : undefined,
    metaAll: (selector) =>
      [...container.querySelectorAll(selector)].map((node) => node.getAttribute('content') ?? ''),
  };
}

/** Head receives the same props a page does; only `location` matters here. */
const headProps = (pathname: string) =>
  makePageProps({ location: { pathname } as PageProps['location'] });

const ROUTES: ReadonlyArray<{ name: string; path: string; render: () => ReactElement }> = [
  { name: 'Home', path: '/', render: () => <HomeHead {...headProps('/')} /> },
  {
    name: 'Platform',
    path: '/platform/',
    render: () => <PlatformHead {...headProps('/platform/')} />,
  },
  {
    name: 'Patient Experience',
    path: '/patient-experience/',
    render: () => <PatientExperienceHead {...headProps('/patient-experience/')} />,
  },
  {
    name: 'Resources',
    path: '/resources/',
    render: () => <ResourcesHead {...headProps('/resources/')} />,
  },
  {
    name: 'Security & Trust',
    path: '/security/',
    render: () => <SecurityHead {...headProps('/security/')} />,
  },
  { name: 'About', path: '/about/', render: () => <AboutHead {...headProps('/about/')} /> },
];

describe.each(ROUTES)('$name metadata', ({ path, render: renderRoute }) => {
  it('has a title and a description written for this page', () => {
    const head = renderHead(renderRoute());

    expect(head.title).toBeTruthy();
    expect(head.description).toBeTruthy();
    // The site-wide fallback appearing on a page means that page never wrote
    // its own description.
    expect(head.description).not.toBe(SITE_METADATA.description);
    expect((head.description ?? '').length).toBeGreaterThan(50);
  });

  it('is canonical at its own URL', () => {
    const head = renderHead(renderRoute());

    expect(head.canonical).toBe(`${SITE_URL}${path}`);
  });

  it('is indexable and carries the site graph', () => {
    const head = renderHead(renderRoute());
    const graph = head.jsonLd?.['@graph'] as Array<Record<string, unknown>> | undefined;

    expect(head.robots).toBe('index, follow');
    expect(graph?.map((node) => node['@type'])).toContain('Organization');
  });
});

describe('titles and descriptions across the site', () => {
  it('gives every route a distinct title and description', () => {
    // Duplicate metadata across pages is what makes a small site look
    // auto-generated to a crawler, and it is invisible page by page.
    const heads = ROUTES.map((route) => renderHead(route.render()));

    expect(new Set(heads.map((head) => head.title)).size).toBe(ROUTES.length);
    expect(new Set(heads.map((head) => head.description)).size).toBe(ROUTES.length);
  });

  it('appends the site name to every page except the home page', () => {
    const home = renderHead(ROUTES[0]!.render());
    const others = ROUTES.slice(1).map((route) => renderHead(route.render()));

    expect(home.title).not.toMatch(/\| NovaHealth$/);
    expect(home.title).toContain('NovaHealth');
    for (const head of others) {
      expect(head.title).toMatch(/\| NovaHealth$/);
    }
  });
});

describe('404 metadata', () => {
  const head = () => renderHead(<NotFoundHead {...headProps('/404/')} />);

  it('keeps the page out of search results while letting a crawler move on', () => {
    expect(head().robots).toBe('noindex, follow');
  });

  it('claims no canonical URL and describes nothing in structured data', () => {
    // The page is served for every URL that does not exist; a canonical would
    // point either at the error page or at a URL that is not real.
    expect(head().canonical).toBeUndefined();
    expect(head().jsonLd).toBeUndefined();
  });

  it('still tells a reader what happened', () => {
    expect(head().title).toMatch(/not found/i);
  });
});

describe('resource detail metadata', () => {
  const resource = resources.find((entry) => entry.updatedAt) ?? resources[0]!;
  const path = `/resources/${resource.slug}/`;

  const renderDetail = () =>
    renderHead(
      <ResourceDetailHead
        {...makePageProps<object, ResourceDetailContext>({
          location: { pathname: path } as PageProps['location'],
          pageContext: { resource, related: [] },
        })}
      />,
    );

  it('derives its title and description from the resource', () => {
    const head = renderDetail();

    expect(head.title).toContain(resource.seo?.title ?? resource.title);
    expect(head.description).toBe(resource.seo?.description ?? resource.summary);
  });

  it('is canonical at the URL the resource is published under', () => {
    expect(renderDetail().canonical).toBe(`${SITE_URL}${path}`);
  });

  it('is an article, with the dates and tags the page itself shows', () => {
    const head = renderDetail();

    expect(head.ogType).toBe('article');
    expect(head.metaAll('meta[property="article:published_time"]')).toEqual([resource.publishedAt]);
    if (resource.updatedAt) {
      expect(head.metaAll('meta[property="article:modified_time"]')).toEqual([resource.updatedAt]);
    }
    expect(head.metaAll('meta[property="article:tag"]')).toEqual([...resource.tags]);
  });

  it('describes the resource as an Article with a resolvable publisher', () => {
    const graph = renderDetail().jsonLd?.['@graph'] as Array<Record<string, unknown>>;
    const article = graph.find((node) => node['@type'] === 'Article');

    expect(article?.headline).toBe(resource.title);
    expect(article?.datePublished).toBe(resource.publishedAt);
    expect((article?.publisher as { '@id': string })['@id']).toBe(`${SITE_URL}/#organization`);
  });

  it('emits the breadcrumb trail the page actually renders', () => {
    const graph = renderDetail().jsonLd?.['@graph'] as Array<Record<string, unknown>>;
    const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList');
    const items = crumbs?.itemListElement as Array<{ name: string; item: string }>;

    expect(items.map((item) => item.name)).toEqual(['Resources', resource.title]);
    expect(items[0]?.item).toBe(`${SITE_URL}/resources/`);
  });

  it('gives two resources different metadata', () => {
    // The template renders from page context, so a mistake here would give
    // every resource the same title.
    const [first, second] = resources;
    const titles = [first!, second!].map(
      (entry) =>
        renderHead(
          <ResourceDetailHead
            {...makePageProps<object, ResourceDetailContext>({
              location: { pathname: `/resources/${entry.slug}/` } as PageProps['location'],
              pageContext: { resource: entry, related: [] },
            })}
          />,
        ).title,
    );

    expect(new Set(titles).size).toBe(2);
  });
});
