import { render } from '@testing-library/react';
import { useStaticQuery } from 'gatsby';
import type { ReactElement } from 'react';
import { Seo } from './Seo';

/**
 * The metadata a page contributes to <head>.
 *
 * Head exports are ordinary components, so they render here like any other.
 * The assertions are about what a crawler receives — one canonical, absolute
 * URLs, matching og:url — rather than about how the component is written.
 *
 * useStaticQuery is the gatsby mock's jest.fn; Gatsby supplies the real result
 * to Head in both renderers.
 */

const mockStaticQuery = useStaticQuery as unknown as jest.Mock;

const SITE_METADATA = {
  title: 'NovaHealth',
  titleTemplate: '%s | NovaHealth',
  description: 'A connected digital health experience.',
  siteUrl: 'https://novahealth.example',
  locale: 'en',
  organization: {
    name: 'NovaHealth',
    legalName: 'NovaHealth Therapeutics',
    tagline: 'Advancing science. Improving lives.',
  },
  socialImage: '/og-image.png',
  socialImageAlt: 'NovaHealth social card',
};

const withSiteUrl = (siteUrl: string) =>
  mockStaticQuery.mockReturnValue({
    site: { siteMetadata: { ...SITE_METADATA, siteUrl } },
  });

/** Renders a Head fragment and exposes the tags it produced. */
function renderHead(element: ReactElement) {
  const { container } = render(element);

  return {
    title: container.querySelector('title')?.textContent,
    canonical: container.querySelectorAll('link[rel="canonical"]'),
    meta: (selector: string) => container.querySelector(selector)?.getAttribute('content'),
    all: (selector: string) => container.querySelectorAll(selector),
    jsonLd: () => {
      const script = container.querySelector('script[type="application/ld+json"]');
      return script ? (JSON.parse(script.innerHTML) as Record<string, unknown>) : undefined;
    },
  };
}

beforeEach(() => {
  mockStaticQuery.mockReset();
  mockStaticQuery.mockReturnValue({ site: { siteMetadata: SITE_METADATA } });
});

describe('Seo', () => {
  describe('title and description', () => {
    it('applies the site title template', () => {
      const head = renderHead(
        <Seo title="Resources" description="Writing." pathname="/resources/" />,
      );

      expect(head.title).toBe('Resources | NovaHealth');
    });

    it('lets a page own its whole title', () => {
      const head = renderHead(
        <Seo title="NovaHealth - Healthcare" description="x" pathname="/" appendSiteName={false} />,
      );

      expect(head.title).toBe('NovaHealth - Healthcare');
    });

    it('emits the description once', () => {
      const head = renderHead(<Seo title="A" description="A summary." pathname="/a/" />);

      expect(head.all('meta[name="description"]')).toHaveLength(1);
      expect(head.meta('meta[name="description"]')).toBe('A summary.');
    });
  });

  describe('canonical', () => {
    it('emits exactly one absolute canonical for the page', () => {
      const head = renderHead(<Seo title="About" description="x" pathname="/about/" />);

      expect(head.canonical).toHaveLength(1);
      expect(head.canonical[0]?.getAttribute('href')).toBe('https://novahealth.example/about/');
    });

    it('matches og:url to the canonical exactly', () => {
      // Two different absolute URLs for one page is the usual cause of a share
      // card pointing somewhere the canonical says is not authoritative.
      const head = renderHead(<Seo title="About" description="x" pathname="/about/" />);

      expect(head.meta('meta[property="og:url"]')).toBe(head.canonical[0]?.getAttribute('href'));
    });

    it('emits none when the build has no configured origin', () => {
      // Better than telling a crawler the real page lives on localhost.
      withSiteUrl('http://localhost:8000');
      const head = renderHead(<Seo title="About" description="x" pathname="/about/" />);

      expect(head.canonical).toHaveLength(0);
      expect(head.all('meta[property="og:url"]')).toHaveLength(0);
      expect(head.all('meta[property="og:image"]')).toHaveLength(0);
    });
  });

  describe('robots', () => {
    it('marks a page indexable by default', () => {
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.meta('meta[name="robots"]')).toBe('index, follow');
    });

    it('keeps a noindex page out of the index but lets crawling continue', () => {
      const head = renderHead(<Seo title="Not found" description="x" pathname="/404/" noIndex />);

      expect(head.meta('meta[name="robots"]')).toBe('noindex, follow');
    });

    it('gives a noindex page no canonical and no structured data', () => {
      // A 404 is served for every URL that does not exist, so a self-referential
      // canonical points either at the error page or at a URL that is not real.
      const head = renderHead(<Seo title="Not found" description="x" pathname="/404/" noIndex />);

      expect(head.canonical).toHaveLength(0);
      expect(head.jsonLd()).toBeUndefined();
    });
  });

  describe('Open Graph and Twitter', () => {
    it('provides the tags a share card is built from', () => {
      const head = renderHead(<Seo title="About" description="About us." pathname="/about/" />);

      expect(head.meta('meta[property="og:type"]')).toBe('website');
      expect(head.meta('meta[property="og:site_name"]')).toBe('NovaHealth');
      expect(head.meta('meta[property="og:title"]')).toBe('About | NovaHealth');
      expect(head.meta('meta[property="og:description"]')).toBe('About us.');
      expect(head.meta('meta[property="og:locale"]')).toBe('en');
    });

    it('makes the social image absolute and states its size', () => {
      // A relative og:image is ignored, and the dimensions let a platform
      // reserve space before it has fetched the file.
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.meta('meta[property="og:image"]')).toBe(
        'https://novahealth.example/og-image.png',
      );
      expect(head.meta('meta[property="og:image:width"]')).toBe('1200');
      expect(head.meta('meta[property="og:image:height"]')).toBe('630');
      expect(head.meta('meta[property="og:image:alt"]')).toBe('NovaHealth social card');
    });

    it('uses a large Twitter card and repeats only what Twitter defines itself', () => {
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.meta('meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(head.meta('meta[name="twitter:title"]')).toBe('A | NovaHealth');
      expect(head.meta('meta[name="twitter:image"]')).toBe(
        'https://novahealth.example/og-image.png',
      );
    });

    it('claims no social account, because the company is fictional', () => {
      // A twitter:site handle would point at somebody else's account.
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.all('meta[name="twitter:site"]')).toHaveLength(0);
      expect(head.all('meta[name="twitter:creator"]')).toHaveLength(0);
    });

    it('adds article properties only for an article', () => {
      const head = renderHead(
        <Seo
          title="A resource"
          description="x"
          pathname="/resources/a/"
          type="article"
          article={{
            publishedTime: '2026-06-11',
            modifiedTime: '2026-07-01',
            authors: ['Tomas Berg'],
            section: 'Interoperability',
            tags: ['fhir', 'hl7'],
          }}
        />,
      );

      expect(head.meta('meta[property="og:type"]')).toBe('article');
      expect(head.meta('meta[property="article:published_time"]')).toBe('2026-06-11');
      expect(head.meta('meta[property="article:modified_time"]')).toBe('2026-07-01');
      expect(head.all('meta[property="article:tag"]')).toHaveLength(2);
    });

    it('omits article properties on an ordinary page', () => {
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.all('meta[property^="article:"]')).toHaveLength(0);
    });
  });

  describe('structured data', () => {
    it('emits exactly one JSON-LD document per page', () => {
      // Two scripts is how a page ends up with competing Organization nodes.
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);

      expect(head.all('script[type="application/ld+json"]')).toHaveLength(1);
    });

    it('carries the site identity on every indexable page', () => {
      const head = renderHead(<Seo title="A" description="x" pathname="/a/" />);
      const graph = head.jsonLd()?.['@graph'] as Array<Record<string, unknown>>;

      expect(graph.map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
    });

    it('appends page nodes with the resolved canonical URL', () => {
      const head = renderHead(
        <Seo
          title="A"
          description="x"
          pathname="/resources/a/"
          jsonLd={({ canonicalUrl }) => [{ '@type': 'Article', url: canonicalUrl }]}
        />,
      );
      const graph = head.jsonLd()?.['@graph'] as Array<Record<string, unknown>>;

      expect(graph).toHaveLength(3);
      expect(graph[2]).toEqual({
        '@type': 'Article',
        url: 'https://novahealth.example/resources/a/',
      });
    });
  });
});
