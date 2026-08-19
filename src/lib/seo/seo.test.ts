import { authors, resources } from '@/lib/content/source';
import { buildFaviconSvg, FAVICON_PNG_SIZE } from './favicon';
import { buildOgImageSvg, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './og-image';
import { buildRobotsTxt, SITEMAP_PATH } from './robots';
import type { SiteIdentity } from './structured-data';
import {
  buildArticle,
  buildBreadcrumbs,
  buildGraph,
  buildOrganization,
  buildWebSite,
  serialiseJsonLd,
} from './structured-data';
import {
  applyTitleTemplate,
  buildAssetUrl,
  buildCanonicalUrl,
  isConfiguredOrigin,
  normalisePathname,
} from './urls';

/**
 * The pure half of the SEO layer.
 *
 * These are the parts that decide what a crawler is told, so they are tested
 * directly rather than only through rendered output: a wrong canonical or a
 * fabricated claim in JSON-LD is invisible on the page and expensive to notice
 * later.
 */

const SITE: SiteIdentity = {
  siteUrl: 'https://novahealth.example',
  name: 'NovaHealth',
  legalName: 'NovaHealth Therapeutics',
  tagline: 'Advancing science. Improving lives.',
  description: 'A connected digital health experience.',
  locale: 'en',
  socialImageUrl: 'https://novahealth.example/og-image.png',
};

describe('URL building', () => {
  describe('origin configuration', () => {
    it.each([undefined, '', 'http://localhost:8000', 'http://localhost:8000/'])(
      'treats %p as no origin at all',
      (origin) => {
        // A production build with no SITE_URL must not claim localhost is the
        // authoritative home of the page.
        expect(isConfiguredOrigin(origin)).toBe(false);
        expect(buildCanonicalUrl(origin, '/about/')).toBeUndefined();
      },
    );

    it('accepts a real origin', () => {
      expect(isConfiguredOrigin('https://novahealth.example')).toBe(true);
    });
  });

  describe('canonical URLs', () => {
    it.each([
      ['/', 'https://novahealth.example/'],
      ['/about', 'https://novahealth.example/about/'],
      ['/about/', 'https://novahealth.example/about/'],
      ['/resources/a-slug/', 'https://novahealth.example/resources/a-slug/'],
    ])('normalises %s to the trailing-slash form the site serves', (pathname, expected) => {
      // Gatsby serves /about/ and /about as one page; only one of them may be
      // canonical or the two compete in an index.
      expect(buildCanonicalUrl(SITE.siteUrl, pathname)).toBe(expected);
    });

    it('never doubles a slash when the origin carries one', () => {
      expect(buildCanonicalUrl('https://novahealth.example/', '/about/')).toBe(
        'https://novahealth.example/about/',
      );
    });

    it('drops query strings and fragments', () => {
      // /resources?search=x is the same document as /resources.
      expect(buildCanonicalUrl(SITE.siteUrl, '/resources/?search=audit')).toBe(
        'https://novahealth.example/resources/',
      );
      expect(normalisePathname('/about/#contact')).toBe('/about/');
    });
  });

  describe('asset URLs', () => {
    it('makes a site-relative asset absolute', () => {
      expect(buildAssetUrl(SITE.siteUrl, '/og-image.png')).toBe(
        'https://novahealth.example/og-image.png',
      );
    });

    it('passes an already absolute URL through', () => {
      expect(buildAssetUrl(SITE.siteUrl, 'https://cdn.example/card.png')).toBe(
        'https://cdn.example/card.png',
      );
    });

    it('omits the URL rather than emitting a relative one', () => {
      // A relative og:image is invalid; no tag is better than a broken one.
      expect(buildAssetUrl('http://localhost:8000', '/og-image.png')).toBeUndefined();
    });
  });

  describe('titles', () => {
    it('applies the site template', () => {
      expect(applyTitleTemplate('Resources', '%s | NovaHealth', true)).toBe(
        'Resources | NovaHealth',
      );
    });

    it('lets a page opt out when its title is already complete', () => {
      expect(applyTitleTemplate('NovaHealth - Healthcare', '%s | NovaHealth', false)).toBe(
        'NovaHealth - Healthcare',
      );
    });
  });
});

describe('structured data', () => {
  it('describes the organisation as fictional inside the graph itself', () => {
    // The footer says so to a reader; this says so to a crawler, which is the
    // one that would otherwise carry the claim into a knowledge panel.
    const organisation = buildOrganization(SITE);

    expect(organisation['@type']).toBe('Organization');
    expect(String(organisation.disambiguatingDescription)).toMatch(/fictional/i);
    expect(String(organisation.disambiguatingDescription)).toMatch(/no certifications/i);
  });

  it('claims no rating, review, price or medical service anywhere', () => {
    // The failure mode this guards against is a future edit adding
    // aggregateRating or a Medical* type to look better in results.
    const graph = JSON.stringify(
      buildGraph([
        buildOrganization(SITE),
        buildWebSite(SITE),
        buildArticle({
          site: SITE,
          resource: resources[0]!,
          authors: authors.slice(0, 1),
          url: 'https://novahealth.example/resources/x/',
        }),
      ]),
    );

    for (const forbidden of [
      /aggregateRating/,
      /"review"/i,
      /"offers"/,
      /Medical[A-Z]/,
      /priceRange/,
      // hasCredential is how an accreditation would be asserted. The word
      // "certifications" does appear — in the disclaimer that denies holding
      // any — so the property is what is checked, not the vocabulary.
      /hasCredential/,
    ]) {
      expect(graph).not.toMatch(forbidden);
    }
  });

  it('points the website search action at a URL the site really answers', () => {
    // The library reads ?search= from the URL, so this describes behaviour
    // rather than hoping for a feature.
    const website = buildWebSite(SITE);
    const action = website.potentialAction as { target: { urlTemplate: string } };

    expect(action.target.urlTemplate).toBe(
      'https://novahealth.example/resources/?search={search_term_string}',
    );
  });

  it('resolves publisher references within one document', () => {
    // A dangling @id reference is the usual result of emitting Article on one
    // page and Organization on another.
    const graph = buildGraph([
      buildOrganization(SITE),
      buildWebSite(SITE),
      buildArticle({
        site: SITE,
        resource: resources[0]!,
        authors: authors.slice(0, 1),
        url: 'https://novahealth.example/resources/x/',
      }),
    ]);

    const nodes = graph['@graph'] as Array<Record<string, unknown>>;
    const ids = new Set(nodes.map((node) => node['@id']));
    const references = nodes
      .map((node) => (node.publisher as { '@id'?: string } | undefined)?.['@id'])
      .filter((id): id is string => id !== undefined);

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(ids.has(reference)).toBe(true);
    }
  });

  describe('article', () => {
    const resource = resources[0]!;
    const article = buildArticle({
      site: SITE,
      resource,
      authors: authors.slice(0, 1),
      url: 'https://novahealth.example/resources/x/',
    });

    it('describes the resource as published rather than a summary of it', () => {
      expect(article.headline).toBe(resource.title);
      expect(article.description).toBe(resource.summary);
      expect(article.datePublished).toBe(resource.publishedAt);
      expect(article.articleSection).toBe(resource.category);
      expect(article.keywords).toEqual(resource.tags);
    });

    it('states reading time in the duration format schema.org expects', () => {
      expect(article.timeRequired).toBe(`PT${resource.readingTimeMinutes}M`);
    });

    it('counts the words in the body it actually renders', () => {
      expect(article.wordCount).toBe(resource.body.trim().split(/\s+/).length);
    });

    it('omits dateModified when the resource was never updated', () => {
      const never = { ...resource, updatedAt: undefined };
      const node = buildArticle({
        site: SITE,
        resource: never,
        authors: [],
        url: 'https://x.example/',
      });

      expect(node).not.toHaveProperty('dateModified');
    });
  });

  it('numbers breadcrumbs from one, in trail order', () => {
    const crumbs = buildBreadcrumbs([
      { name: 'Resources', url: 'https://novahealth.example/resources/' },
      { name: 'A resource', url: 'https://novahealth.example/resources/a/' },
    ]);
    const items = crumbs.itemListElement as Array<{ position: number; name: string }>;

    expect(items.map((item) => item.position)).toEqual([1, 2]);
    expect(items[0]?.name).toBe('Resources');
  });

  it('serialises to JSON that cannot close the script element', () => {
    const serialised = serialiseJsonLd(
      buildGraph([{ '@type': 'Thing', name: 'a </script> attempt' }]),
    );

    expect(serialised).not.toContain('</script>');
    expect(JSON.parse(serialised)).toMatchObject({ '@context': 'https://schema.org' });
  });
});

describe('robots.txt', () => {
  it('allows crawling and advertises the sitemap', () => {
    const robots = buildRobotsTxt('https://novahealth.example');

    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(`Sitemap: https://novahealth.example${SITEMAP_PATH}`);
  });

  it('never blocks the whole site', () => {
    expect(buildRobotsTxt('https://novahealth.example')).not.toMatch(/^Disallow: \/$/m);
  });

  it('leaves the API crawlable', () => {
    // The library fetches /api/resources in the browser, so a crawler
    // rendering the page needs that request to succeed.
    expect(buildRobotsTxt('https://novahealth.example')).not.toMatch(/Disallow:.*api/i);
  });

  it('omits the sitemap line rather than pointing at localhost', () => {
    const robots = buildRobotsTxt(undefined);

    expect(robots).not.toMatch(/Sitemap:/);
    expect(robots).toMatch(/no SITE_URL/i);
  });
});

describe('social card', () => {
  const svg = buildOgImageSvg({
    siteName: 'NovaHealth',
    headlineLines: ['Healthcare, designed', 'around people.'],
    summary: 'Scheduling, unified records and care team messaging.',
    footnote: 'A fictional demonstration project.',
  });

  it('is drawn at the size every platform expects', () => {
    // 1200x630 is the recommended Open Graph size; anything else is cropped or
    // upscaled by the platform rather than by us.
    expect([OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT]).toEqual([1200, 630]);
    expect(svg).toContain(`width="${OG_IMAGE_WIDTH}"`);
    expect(svg).toContain(`height="${OG_IMAGE_HEIGHT}"`);
  });

  it('carries the disclaimer, because a card travels without the page', () => {
    expect(svg).toMatch(/fictional demonstration project/i);
  });

  it('escapes copy so an ampersand cannot break the document', () => {
    const escaped = buildOgImageSvg({
      siteName: 'A & B',
      headlineLines: ['<not a tag>'],
      summary: 'x',
      footnote: 'y',
    });

    expect(escaped).toContain('A &amp; B');
    expect(escaped).toContain('&lt;not a tag&gt;');
    expect(escaped).not.toMatch(/<not a tag>/);
  });
});

describe('site icon', () => {
  const svg = buildFaviconSvg();

  it('is square and scalable', () => {
    // One source, rasterised to the sizes browsers ask for.
    expect(svg).toMatch(/viewBox="0 0 64 64"/);
    expect(FAVICON_PNG_SIZE).toBe(32);
  });

  it('is drawn on a filled tile rather than transparency', () => {
    // A transparent mark disappears against a dark browser theme, which is
    // where a tab icon spends half its life.
    expect(svg).toMatch(/<rect[^>]*fill="#0f172a"/);
  });

  it('uses geometry only, so it survives being 16 pixels wide', () => {
    // Text is illegible at tab size and would also depend on a font being
    // installed wherever the PNG fallbacks are rendered.
    expect(svg).not.toMatch(/<text/);
    expect(svg).not.toMatch(/font-family/);
  });
});
