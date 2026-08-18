import { Link } from 'gatsby';
import { Badge } from '@/components/patterns/Badge';
import { getAuthorsByIds } from '@/lib/content/source';
import { formatPublishedDate } from '@/lib/resources/format';
import type { Resource } from '@/types/content';
import { RESOURCE_CATEGORY_LABELS, RESOURCE_FORMAT_LABELS } from '@/types/content';
import * as styles from './ResourceCard.module.css';

/**
 * A single resource in the library grid.
 *
 * The heading level is a prop because the card's correct level depends on where
 * it is used: h3 under the library's h2, h3 under "Related resources" on a
 * detail page. Hard-coding it would break the document outline in one of them.
 */
interface ResourceCardProps {
  resource: Resource;
  headingLevel?: 'h3' | 'h4';
}

export function ResourceCard({ resource, headingLevel: Heading = 'h3' }: ResourceCardProps) {
  const authors = getAuthorsByIds(resource.authorIds);

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <Badge tone="accent">{RESOURCE_CATEGORY_LABELS[resource.category]}</Badge>
        <span className={styles.format}>{RESOURCE_FORMAT_LABELS[resource.format]}</span>
      </div>

      <Heading className={styles.title}>
        <Link to={`/resources/${resource.slug}`} className={styles.link}>
          {resource.title}
        </Link>
      </Heading>

      <p className={styles.summary}>{resource.summary}</p>

      <div className={styles.footer}>
        {/* A time element carries the machine-readable date alongside the
            human-readable one. */}
        <time dateTime={resource.publishedAt}>{formatPublishedDate(resource.publishedAt)}</time>
        <span className={styles.separator} aria-hidden="true">
          &middot;
        </span>
        <span>{resource.readingTimeMinutes} min read</span>
        {authors[0] && (
          <>
            <span className={styles.separator} aria-hidden="true">
              &middot;
            </span>
            <span>{authors[0].name}</span>
          </>
        )}
      </div>
    </article>
  );
}
