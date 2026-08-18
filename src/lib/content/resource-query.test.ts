import { resources } from './source';
import { DEFAULT_PAGE_SIZE, queryResources } from './resource-query';

describe('queryResources', () => {
  it('returns the first page of everything for an empty query', () => {
    const result = queryResources(resources);

    expect(result.data).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(result.meta.total).toBe(resources.length);
    expect(result.meta.page).toBe(1);
    expect(result.meta.totalPages).toBe(Math.ceil(resources.length / DEFAULT_PAGE_SIZE));
  });

  describe('search', () => {
    it('matches on title, summary and tags', () => {
      const byTitle = queryResources(resources, { q: 'audit logging' });
      expect(byTitle.meta.total).toBeGreaterThan(0);
      expect(byTitle.data[0]?.title).toMatch(/audit/i);

      const byTag = queryResources(resources, { q: 'fhir' });
      expect(byTag.meta.total).toBeGreaterThan(0);
    });

    it('ignores case and surrounding whitespace', () => {
      const plain = queryResources(resources, { q: 'accessibility' });
      const messy = queryResources(resources, { q: '  ACCESSIBILITY  ' });

      expect(messy.meta.total).toBe(plain.meta.total);
      expect(messy.meta.total).toBeGreaterThan(0);
    });

    it('returns an empty page rather than throwing when nothing matches', () => {
      const result = queryResources(resources, { q: 'zzzzznotathing' });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      // totalPages stays at 1 so the pager has a coherent page to describe.
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('filtering', () => {
    it('restricts results to one category', () => {
      const result = queryResources(resources, { category: 'interoperability', pageSize: 50 });

      expect(result.meta.total).toBeGreaterThan(0);
      expect(result.data.every((r) => r.category === 'interoperability')).toBe(true);
    });

    it('combines a category with a search term', () => {
      // The classic filtering bug is applying one condition and dropping the
      // other, which looks correct whenever the ignored filter matches anyway.
      // 'access' appears in four categories, so a dropped category filter would
      // return more rows and a dropped search filter would return the other
      // security entry. Both mistakes fail.
      const term = 'access';
      const matchesTerm = (r: (typeof resources)[number]) =>
        new RegExp(term, 'i').test([r.title, r.summary, ...r.tags].join(' '));

      const all = queryResources(resources, { category: 'security-privacy', pageSize: 50 });
      const narrowed = queryResources(resources, {
        category: 'security-privacy',
        q: term,
        pageSize: 50,
      });

      // Asserted against the intersection computed independently, so the test
      // fails if either condition is dropped rather than only when the ignored
      // one happens not to match.
      const expected = resources.filter((r) => r.category === 'security-privacy' && matchesTerm(r));

      expect(expected.length).toBeGreaterThan(0);
      expect(narrowed.meta.total).toBe(expected.length);
      expect(narrowed.meta.total).toBeLessThan(all.meta.total);
      expect(queryResources(resources, { q: term, pageSize: 50 }).meta.total).toBeGreaterThan(
        narrowed.meta.total,
      );
    });
  });

  describe('sorting', () => {
    it('orders newest first by default', () => {
      const result = queryResources(resources, { pageSize: 50 });
      const dates = result.data.map((r) => r.publishedAt);

      expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
    });

    it('reverses for oldest', () => {
      const result = queryResources(resources, { sort: 'oldest', pageSize: 50 });
      const dates = result.data.map((r) => r.publishedAt);

      expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
    });

    it('orders alphabetically by title', () => {
      const result = queryResources(resources, { sort: 'title', pageSize: 50 });
      const titles = result.data.map((r) => r.title);

      expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
    });

    it('does not mutate the source collection', () => {
      // sort() sorts in place, and `resources` is the shared content module.
      const before = resources.map((r) => r.id);
      queryResources(resources, { sort: 'title' });

      expect(resources.map((r) => r.id)).toEqual(before);
    });
  });

  describe('pagination', () => {
    it('splits results into pages without dropping or repeating entries', () => {
      const pageSize = 5;
      const seen: string[] = [];
      const totalPages = queryResources(resources, { pageSize }).meta.totalPages;

      for (let page = 1; page <= totalPages; page += 1) {
        seen.push(...queryResources(resources, { page, pageSize }).data.map((r) => r.id));
      }

      expect(seen).toHaveLength(resources.length);
      expect(new Set(seen).size).toBe(resources.length);
    });

    it('clamps a page beyond the end to the last real page', () => {
      const result = queryResources(resources, { page: 99, pageSize: 5 });

      expect(result.meta.page).toBe(result.meta.totalPages);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('clamps a page below one', () => {
      expect(queryResources(resources, { page: 0 }).meta.page).toBe(1);
      expect(queryResources(resources, { page: -3 }).meta.page).toBe(1);
    });

    it('caps page size so a hand-edited URL cannot request everything', () => {
      const result = queryResources(resources, { pageSize: 10_000 });

      expect(result.meta.pageSize).toBeLessThanOrEqual(24);
    });

    it('resolves an unparsable page size to the default', () => {
      expect(queryResources(resources, { pageSize: Number.NaN }).meta.pageSize).toBe(
        DEFAULT_PAGE_SIZE,
      );
    });
  });
});
