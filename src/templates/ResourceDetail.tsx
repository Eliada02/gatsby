import type { HeadFC, PageProps } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/patterns/Badge';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Seo } from '@/components/seo/Seo';
import { getAuthorsByIds } from '@/lib/content/source';
import { formatPublishedDate } from '@/lib/resources/format';
import type { Resource } from '@/types/content';
import { RESOURCE_CATEGORY_LABELS, RESOURCE_FORMAT_LABELS } from '@/types/content';
import * as styles from './ResourceDetail.module.css';

export interface ResourceDetailContext {
  resource: Resource;
  related: Resource[];
}

const RELATED_HEADING_ID = 'related-resources-heading';

/**
 * A single resource.
 *
 * Statically generated per resource by createPages, so every entry has its own
 * indexable URL and loads without JavaScript.
 *
 * The body is stored as plain paragraphs separated by blank lines and rendered
 * as such. A markdown pipeline would be a dependency and a build step for
 * content that has no headings, lists or links in it; when the content needs
 * more, that is the point to add one.
 */
const ResourceDetailTemplate = ({ pageContext }: PageProps<object, ResourceDetailContext>) => {
  const { resource, related } = pageContext;
  const authors = getAuthorsByIds(resource.authorIds);
  const paragraphs = resource.body.split('\n\n').filter((paragraph) => paragraph.trim() !== '');

  return (
    <Layout>
      <article>
        <Section tone="canvas" spacing="default">
          <Container size="narrow">
            {/* Placed before the title so it is the first thing after the
                navigation for keyboard and screen reader users. */}
            <p className={styles.backLink}>
              <ButtonLink to="/resources" variant="ghost" size="sm">
                <span aria-hidden="true">&larr;</span> All resources
              </ButtonLink>
            </p>

            <header className={styles.header}>
              <div className={styles.badges}>
                <Badge tone="accent">{RESOURCE_CATEGORY_LABELS[resource.category]}</Badge>
                <span className={styles.format}>{RESOURCE_FORMAT_LABELS[resource.format]}</span>
              </div>

              <h1 className={styles.title}>{resource.title}</h1>
              <p className={styles.summary}>{resource.summary}</p>

              <dl className={styles.meta}>
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>Published</dt>
                  <dd className={styles.metaValue}>
                    <time dateTime={resource.publishedAt}>
                      {formatPublishedDate(resource.publishedAt)}
                    </time>
                  </dd>
                </div>

                {resource.updatedAt && (
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>Updated</dt>
                    <dd className={styles.metaValue}>
                      <time dateTime={resource.updatedAt}>
                        {formatPublishedDate(resource.updatedAt)}
                      </time>
                    </dd>
                  </div>
                )}

                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>Reading time</dt>
                  <dd className={styles.metaValue}>{resource.readingTimeMinutes} minutes</dd>
                </div>

                {authors.length > 0 && (
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {authors.length === 1 ? 'Author' : 'Authors'}
                    </dt>
                    <dd className={styles.metaValue}>
                      {authors
                        .map((author) =>
                          author.credentials
                            ? `${author.name} (${author.credentials})`
                            : author.name,
                        )
                        .join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </header>

            <div className={styles.body}>
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>

            <ul className={styles.tags}>
              {resource.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </Container>
        </Section>

        {related.length > 0 && (
          <Section tone="surface" border="top" aria-labelledby={RELATED_HEADING_ID}>
            <Container>
              <h2 id={RELATED_HEADING_ID} className={styles.relatedHeading}>
                More on {RESOURCE_CATEGORY_LABELS[resource.category]}
              </h2>
              <ul className={styles.relatedGrid}>
                {related.map((item) => (
                  <li key={item.id}>
                    <ResourceCard resource={item} />
                  </li>
                ))}
              </ul>
            </Container>
          </Section>
        )}
      </article>
    </Layout>
  );
};

export default ResourceDetailTemplate;

/**
 * Per-resource metadata. Falls back to the title and summary when the content
 * has no explicit SEO override, so every page has a unique title and
 * description without requiring the fields to be filled in.
 */
export const Head: HeadFC<object, ResourceDetailContext> = ({ pageContext }) => (
  <Seo
    title={pageContext.resource.seo?.title ?? pageContext.resource.title}
    description={pageContext.resource.seo?.description ?? pageContext.resource.summary}
  />
);
