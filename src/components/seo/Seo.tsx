interface SeoProps {
  title: string;
  description: string;
  /** Home sets its own full title; every other page appends the site name. */
  appendSiteName?: boolean;
}

/**
 * Metadata for Gatsby's Head API.
 *
 * Minimal by design at this stage: Open Graph, canonical URLs and structured
 * data are added in the SEO phase, where they can be verified against a built
 * site rather than asserted in the abstract.
 */
export function Seo({ title, description, appendSiteName = true }: SeoProps) {
  return (
    <>
      <title>{appendSiteName ? `${title} | NovaHealth` : title}</title>
      <meta name="description" content={description} />
    </>
  );
}
