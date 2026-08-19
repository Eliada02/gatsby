import type { Author, Resource } from '@/types/content';

/**
 * JSON-LD builders.
 *
 * Structured data is a set of claims made to a machine that a human cannot see,
 * which makes it the easiest place in a codebase to assert something untrue.
 * Everything emitted here is visible on the page it describes, and the
 * fictional nature of the company is stated in the graph itself rather than
 * only in the footer — `disambiguatingDescription` exists for exactly this.
 *
 * Deliberately absent: aggregateRating, review, offers, MedicalOrganization and
 * any Medical* type. There are no ratings, no prices, and no clinical service —
 * asserting otherwise would be a fabricated claim in a health context, which is
 * the worst version of this mistake.
 *
 * One page emits one graph. The builders below return nodes that the SEO
 * component assembles into a single @graph, so two components can never emit
 * competing Organization definitions.
 */

/** A JSON-LD node. Values are whatever JSON.stringify accepts. */
export type JsonLdNode = Record<string, unknown>;

export interface SiteIdentity {
  siteUrl: string;
  name: string;
  legalName?: string;
  tagline?: string;
  description: string;
  locale: string;
  socialImageUrl?: string;
}

/** Stable @id values, so nodes can reference each other rather than repeat. */
export const ORGANIZATION_ID = '#organization';
export const WEBSITE_ID = '#website';

export function buildOrganization(site: SiteIdentity): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': `${site.siteUrl}/${ORGANIZATION_ID}`,
    name: site.name,
    ...(site.legalName ? { legalName: site.legalName } : {}),
    url: `${site.siteUrl}/`,
    description: site.description,
    ...(site.tagline ? { slogan: site.tagline } : {}),
    ...(site.socialImageUrl ? { logo: site.socialImageUrl, image: site.socialImageUrl } : {}),
    /*
     * Stated in the graph, not only in the footer. A crawler ingesting this
     * should not come away believing NovaHealth is a real provider.
     */
    disambiguatingDescription:
      'NovaHealth is a fictional company created for a portfolio demonstration. It provides no real services and holds no certifications.',
  };
}

export function buildWebSite(site: SiteIdentity): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': `${site.siteUrl}/${WEBSITE_ID}`,
    name: site.name,
    url: `${site.siteUrl}/`,
    description: site.description,
    inLanguage: site.locale,
    publisher: { '@id': `${site.siteUrl}/${ORGANIZATION_ID}` },
    /*
     * The site really does have a search that answers this URL, so the action
     * is a description of behaviour rather than a hopeful annotation.
     */
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.siteUrl}/resources/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * An Article for a resource.
 *
 * Every field is taken from the resource as published, so the structured data
 * cannot describe something different from the page. `wordCount` and
 * `timeRequired` come from the body and the stored reading time rather than
 * being estimated here.
 */
export function buildArticle(params: {
  site: SiteIdentity;
  resource: Resource;
  authors: readonly Author[];
  url: string;
}): JsonLdNode {
  const { site, resource, authors, url } = params;
  const wordCount = resource.body.trim().split(/\s+/).filter(Boolean).length;

  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: resource.title,
    description: resource.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: resource.publishedAt,
    ...(resource.updatedAt ? { dateModified: resource.updatedAt } : {}),
    inLanguage: site.locale,
    // Credentials are part of how the site presents an author, so they travel.
    author: authors.map((author) => ({
      '@type': 'Person',
      name: author.name,
      ...(author.credentials ? { honorificSuffix: author.credentials } : {}),
      jobTitle: author.role,
    })),
    publisher: { '@id': `${site.siteUrl}/${ORGANIZATION_ID}` },
    articleSection: resource.category,
    keywords: resource.tags,
    wordCount,
    timeRequired: `PT${resource.readingTimeMinutes}M`,
  };
}

export interface Breadcrumb {
  name: string;
  url: string;
}

/**
 * A breadcrumb trail.
 *
 * Only emitted where the site shows one: the resource detail page has a visible
 * "All resources" route back to its parent. Declaring a trail the page does not
 * display would be describing navigation that does not exist.
 */
export function buildBreadcrumbs(items: readonly Breadcrumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Wraps nodes into the single document a page emits.
 *
 * `@graph` rather than an array of separate scripts: one script per page means
 * there is exactly one place a duplicate could come from, and the `@id`
 * references above resolve within it.
 */
export function buildGraph(nodes: readonly JsonLdNode[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/**
 * Serialises a graph for embedding in a <script> tag.
 *
 * `<` is escaped because a `</script>` sequence inside a JSON string would end
 * the script element early. The content here is ours, but the escape costs
 * nothing and removes the class of bug entirely.
 */
export function serialiseJsonLd(graph: JsonLdNode): string {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}
