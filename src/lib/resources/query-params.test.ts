import {
  applyQueryPatch,
  buildResourceHref,
  buildResourceSearch,
  isDefaultQuery,
  parseResourceQuery,
} from './query-params';

describe('parseResourceQuery', () => {
  it('reads every supported parameter', () => {
    const query = parseResourceQuery('?search=patient&category=digital-health&sort=oldest&page=2');

    expect(query).toEqual({
      q: 'patient',
      category: 'digital-health',
      sort: 'oldest',
      page: 2,
    });
  });

  it('returns an empty query for a bare URL', () => {
    expect(parseResourceQuery('')).toEqual({});
    expect(parseResourceQuery('?')).toEqual({});
  });

  it('drops values it does not recognise', () => {
    // The URL is user-editable. A hand-typed category should show the whole
    // library rather than an error page; the endpoint rejects unknown values
    // separately, so neither boundary trusts the other.
    const query = parseResourceQuery('?category=not-a-category&sort=sideways');

    expect(query.category).toBeUndefined();
    expect(query.sort).toBeUndefined();
  });

  it('ignores a blank or whitespace-only search term', () => {
    expect(parseResourceQuery('?search=').q).toBeUndefined();
    expect(parseResourceQuery('?search=%20%20').q).toBeUndefined();
  });

  it('ignores page values that are not a real page beyond the first', () => {
    expect(parseResourceQuery('?page=1').page).toBeUndefined();
    expect(parseResourceQuery('?page=0').page).toBeUndefined();
    expect(parseResourceQuery('?page=-2').page).toBeUndefined();
    expect(parseResourceQuery('?page=abc').page).toBeUndefined();
  });

  it('decodes encoded search terms', () => {
    expect(parseResourceQuery('?search=role%20based%20access').q).toBe('role based access');
  });
});

describe('buildResourceSearch', () => {
  it('omits defaults so the canonical library URL stays clean', () => {
    expect(buildResourceSearch({})).toBe('');
    expect(buildResourceSearch({ sort: 'newest' })).toBe('');
    expect(buildResourceSearch({ page: 1 })).toBe('');
  });

  it('round-trips a full query', () => {
    const query = { q: 'audit', category: 'security-privacy', sort: 'oldest', page: 3 } as const;

    expect(parseResourceQuery(buildResourceSearch(query))).toEqual(query);
  });

  it('encodes characters that would break the URL', () => {
    expect(buildResourceSearch({ q: 'a&b' })).toContain('search=a%26b');
  });

  it('builds an href against the resources route', () => {
    expect(buildResourceHref({ page: 2 })).toBe('/resources?page=2');
    expect(buildResourceHref({})).toBe('/resources');
  });
});

describe('applyQueryPatch', () => {
  it('returns to page 1 when a filter changes', () => {
    // A reader on page 3 who narrows the search would otherwise land on page 3
    // of a shorter result set, which is usually empty and reads as "no results"
    // for a search that actually matched.
    const current = { q: 'care', page: 3 } as const;

    expect(applyQueryPatch(current, { category: 'digital-health' }).page).toBeUndefined();
    expect(applyQueryPatch(current, { q: 'access' }).page).toBeUndefined();
    expect(applyQueryPatch(current, { sort: 'title' }).page).toBeUndefined();
  });

  it('keeps the rest of the query when one field changes', () => {
    const next = applyQueryPatch({ q: 'care', category: 'digital-health' }, { sort: 'oldest' });

    expect(next.q).toBe('care');
    expect(next.category).toBe('digital-health');
    expect(next.sort).toBe('oldest');
  });

  it('preserves filters when only the page changes', () => {
    const next = applyQueryPatch({ q: 'care', category: 'digital-health' }, { page: 2 });

    expect(next).toEqual({ q: 'care', category: 'digital-health', page: 2 });
  });

  it('clears a field when it is set to empty', () => {
    const next = applyQueryPatch({ q: 'care', category: 'digital-health' }, { q: '' });

    expect(next.q).toBeUndefined();
    expect(buildResourceSearch(next)).not.toContain('search=');
  });
});

describe('isDefaultQuery', () => {
  it('recognises an unfiltered view', () => {
    expect(isDefaultQuery({})).toBe(true);
    expect(isDefaultQuery({ sort: 'newest' })).toBe(true);
    expect(isDefaultQuery({ q: 'care' })).toBe(false);
    expect(isDefaultQuery({ category: 'digital-health' })).toBe(false);
  });
});
