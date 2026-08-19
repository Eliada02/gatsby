import { useSiteMetadata } from '@/hooks/useSiteMetadata';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '@/lib/seo/og-image';
import type { JsonLdNode, SiteIdentity } from '@/lib/seo/structured-data';
import {
  buildGraph,
  buildOrganization,
  buildWebSite,
  serialiseJsonLd,
} from '@/lib/seo/structured-data';
import { applyTitleTemplate, buildAssetUrl, buildCanonicalUrl } from '@/lib/seo/urls';

/**
 * Metadata for Gatsby's Head API.
 *
 * One component owns every tag a page contributes to <head>: title,
 * description, canonical, robots, Open Graph, Twitter and JSON-LD. Pages pass
 * what is specific to them and nothing else, so there is no page that "forgot"
 * the canonical or spelled og:type differently.
 *
 * `pathname` is required rather than optional. A missing canonical is invisible
 * — the page looks correct and the mistake only shows up as duplicate-content
 * warnings months later — so the type system asks for it at every call site.
 * Head receives `location`, so passing it costs one prop.
 */

export interface ArticleMetadata {
  publishedTime: string;
  modifiedTime?: string;
  authors?: readonly string[];
  section?: string;
  tags?: readonly string[];
}

interface SeoProps {
  title: string;
  description: string;
  /** `location.pathname` from the Head props. Drives canonical and og:url. */
  pathname: string;
  /** Home sets its own full title; every other page appends the site name. */
  appendSiteName?: boolean;
  /** Keeps a page out of search results. Used by 404. */
  noIndex?: boolean;
  /** `article` for a resource, `website` for everything else. */
  type?: 'website' | 'article';
  /** Article-specific Open Graph properties, only read when type is article. */
  article?: ArticleMetadata;
  /**
   * Page-specific structured data, appended to the site graph.
   *
   * A function rather than an array, because the nodes a page wants to add
   * usually need the resolved canonical URL and the site identity — and those
   * are resolved here. Handing them to the page is what stops a second copy of
   * the URL logic appearing in a template.
   */
  jsonLd?: (context: SeoJsonLdContext) => readonly JsonLdNode[];
}

export interface SeoJsonLdContext {
  site: SiteIdentity;
  /** Absolute URL of this page, absent when no origin is configured. */
  canonicalUrl: string | undefined;
}

export function Seo({
  title,
  description,
  pathname,
  appendSiteName = true,
  noIndex = false,
  type = 'website',
  article,
  jsonLd,
}: SeoProps) {
  const metadata = useSiteMetadata();

  const fullTitle = applyTitleTemplate(title, metadata.titleTemplate, appendSiteName);
  const imageUrl = buildAssetUrl(metadata.siteUrl, metadata.socialImage);

  /*
   * A page kept out of the index gets no canonical.
   *
   * The 404 is the case that matters: it is served for every URL that does not
   * exist, so a self-referential canonical either points at /404/ — a page
   * nobody should be sent to — or, on a client-side miss, at the mistyped URL
   * the reader arrived on. Both are worse than saying nothing. og:url follows
   * the same rule, so the two can never disagree.
   */
  const canonical = noIndex ? undefined : buildCanonicalUrl(metadata.siteUrl, pathname);

  /*
   * Absolute URLs are omitted rather than guessed when no origin is configured.
   * A canonical or og:url pointing at localhost is worse than none: it tells a
   * crawler the real copy of the page lives somewhere it cannot reach.
   */
  const identity: SiteIdentity = {
    siteUrl: (metadata.siteUrl ?? '').replace(/\/+$/, ''),
    name: metadata.organization.name,
    legalName: metadata.organization.legalName,
    tagline: metadata.organization.tagline,
    description: metadata.description,
    locale: metadata.locale,
    ...(imageUrl ? { socialImageUrl: imageUrl } : {}),
  };

  /*
   * The site graph travels with every indexable page so that the publisher and
   * website references on an Article resolve within the same document. A page
   * kept out of the index gets no structured data at all — there is nothing for
   * it to describe truthfully.
   */
  const pageNodes = jsonLd?.({ site: identity, canonicalUrl: canonical }) ?? [];
  const graph = noIndex
    ? undefined
    : buildGraph([buildOrganization(identity), buildWebSite(identity), ...pageNodes]);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? 'noindex, follow' : 'index, follow'} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph. og:url matches the canonical exactly; two different
          absolute URLs for one page is the usual cause of a wrong share card. */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={metadata.title} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:locale" content={metadata.locale} />
      {canonical && <meta property="og:url" content={canonical} />}
      {imageUrl && (
        <>
          <meta property="og:image" content={imageUrl} />
          <meta property="og:image:alt" content={metadata.socialImageAlt} />
          {/* Dimensions let a platform reserve the space before fetching. */}
          <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
          <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
        </>
      )}

      {type === 'article' && article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.section && <meta property="article:section" content={article.section} />}
          {article.authors?.map((author) => (
            <meta key={author} property="article:author" content={author} />
          ))}
          {article.tags?.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/*
       * Twitter reads the Open Graph tags for anything it does not define, so
       * only the card type and the fields it treats separately are repeated.
       * No twitter:site or twitter:creator: NovaHealth is fictional and has no
       * account, and inventing a handle would point at someone else's.
       */}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl && (
        <>
          <meta name="twitter:image" content={imageUrl} />
          <meta name="twitter:image:alt" content={metadata.socialImageAlt} />
        </>
      )}

      {graph && (
        <script
          type="application/ld+json"
          // Serialised through one helper that escapes `<`, so a value can
          // never close the script element early.
          dangerouslySetInnerHTML={{ __html: serialiseJsonLd(graph) }}
        />
      )}
    </>
  );
}
