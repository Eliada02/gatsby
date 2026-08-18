import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { getAuthorsByIds, resources } from '@/lib/content/source';
import { makePageProps } from '@/test-utils/page-props';
import { RESOURCE_CATEGORY_LABELS } from '@/types/content';
import ResourceDetailTemplate from './ResourceDetail';
import type { ResourceDetailContext } from './ResourceDetail';

/**
 * The detail template renders whatever createPages puts in page context, so the
 * tests supply the same shape gatsby-node builds.
 */

const resource = resources.find((entry) => entry.updatedAt !== undefined) ?? resources[0]!;
const related = resources
  .filter((entry) => entry.category === resource.category && entry.id !== resource.id)
  .slice(0, 3);

const renderDetail = (context: Partial<ResourceDetailContext> = {}) =>
  render(
    <ResourceDetailTemplate
      {...makePageProps<object, ResourceDetailContext>({
        pageContext: { resource, related, ...context },
      })}
    />,
  );

describe('ResourceDetail', () => {
  it('uses the resource title as the page heading', () => {
    renderDetail();

    expect(screen.getByRole('heading', { level: 1, name: resource.title })).toBeInTheDocument();
  });

  it('shows category, dates, reading time and author', () => {
    renderDetail();

    // Scoped to the article header: the related cards legitimately repeat the
    // category label, so an unscoped query would match several elements.
    const header = screen
      .getByRole('heading', { level: 1, name: resource.title })
      .closest('header');
    expect(header).not.toBeNull();

    const inHeader = within(header!);
    expect(inHeader.getByText(RESOURCE_CATEGORY_LABELS[resource.category])).toBeInTheDocument();
    expect(inHeader.getByText(`${resource.readingTimeMinutes} minutes`)).toBeInTheDocument();
    expect(inHeader.getByText(/published/i)).toBeInTheDocument();

    const author = getAuthorsByIds(resource.authorIds)[0];
    expect(author).toBeDefined();
    expect(inHeader.getByText(new RegExp(author!.name))).toBeInTheDocument();
  });

  it('exposes machine-readable dates', () => {
    // A visible date alone is not parseable; the datetime attribute is what
    // makes it usable by anything other than a human reader.
    const { container } = renderDetail();
    const published = container.querySelector(`time[datetime="${resource.publishedAt}"]`);

    expect(published).toBeInTheDocument();
  });

  it('renders the body as separate paragraphs', () => {
    const { container } = renderDetail();
    const expected = resource.body.split('\n\n').filter((part) => part.trim() !== '').length;

    // A single paragraph containing the blank lines would render as one wall of
    // text, since HTML collapses newlines.
    expect(container.querySelectorAll('article p').length).toBeGreaterThanOrEqual(expected);
  });

  it('offers a route back to the library', () => {
    renderDetail();

    expect(screen.getByRole('link', { name: /all resources/i })).toHaveAttribute(
      'href',
      '/resources',
    );
  });

  it('lists related resources without repeating the current one', () => {
    renderDetail();
    const section = screen.getByRole('region', { name: /more on/i });

    expect(within(section).getAllByRole('article')).toHaveLength(related.length);
    expect(
      within(section).queryByRole('heading', { level: 3, name: resource.title }),
    ).not.toBeInTheDocument();
  });

  it('omits the related section entirely when there is nothing to relate to', () => {
    // Rendering an empty "More on ..." heading would be worse than omitting it.
    renderDetail({ related: [] });

    expect(screen.queryByRole('region', { name: /more on/i })).not.toBeInTheDocument();
  });

  it('keeps heading levels in order', () => {
    renderDetail();
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.substring(1)));

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = renderDetail();

    expect(await axe(container)).toHaveNoViolations();
  });
});
