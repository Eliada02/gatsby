import {
  RESOURCE_CATEGORIES,
  RESOURCE_FORMATS,
  DEVELOPMENT_STAGES,
  THERAPEUTIC_AREAS,
} from '@/types/content';
import {
  authors,
  getAuthorsByIds,
  getResourceBySlug,
  researchPrograms,
  resources,
  treatments,
} from './source';

/**
 * Content integrity tests.
 *
 * src/lib/content/source.ts asserts that the JSON matches the content model
 * rather than validating it at runtime. These tests are what makes that
 * assertion safe: a typo in a category, a duplicate slug or a dangling author
 * reference fails CI instead of reaching a page.
 *
 * This is the check a CMS would otherwise perform on publish.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('content integrity', () => {
  it('ships content in every collection', () => {
    expect(resources.length).toBeGreaterThan(0);
    expect(treatments.length).toBeGreaterThan(0);
    expect(researchPrograms.length).toBeGreaterThan(0);
    expect(authors.length).toBeGreaterThan(0);
  });

  describe('resources', () => {
    it('has unique ids and slugs', () => {
      // Duplicate slugs would silently collide into a single generated route.
      expect(new Set(resources.map((r) => r.id)).size).toBe(resources.length);
      expect(new Set(resources.map((r) => r.slug)).size).toBe(resources.length);
    });

    it('uses only known categories and formats', () => {
      for (const resource of resources) {
        expect(RESOURCE_CATEGORIES).toContain(resource.category);
        expect(RESOURCE_FORMATS).toContain(resource.format);
      }
    });

    it('uses parseable ISO publication dates', () => {
      // Sorting by date relies on these being lexicographically comparable.
      for (const resource of resources) {
        expect(resource.publishedAt).toMatch(ISO_DATE);
        expect(Number.isNaN(Date.parse(resource.publishedAt))).toBe(false);
      }
    });

    it('references only authors that exist', () => {
      for (const resource of resources) {
        expect(resource.authorIds.length).toBeGreaterThan(0);
        expect(getAuthorsByIds(resource.authorIds)).toHaveLength(resource.authorIds.length);
      }
    });

    it('provides alt text for every image', () => {
      // Media.alt is required by the type, but an empty string would type-check.
      // Empty alt is only correct for decorative images, and content images here
      // are never decorative.
      for (const resource of resources) {
        if (resource.heroImage) {
          expect(resource.heroImage.alt.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('declares a file size alongside every download', () => {
      // The download CTA announces the size so users on metered connections can
      // make an informed choice before starting a transfer.
      for (const resource of resources.filter((r) => r.downloadUrl)) {
        expect(resource.fileSizeKb).toBeGreaterThan(0);
      }
    });

    it('is retrievable by slug', () => {
      const [first] = resources;

      expect(first).toBeDefined();
      expect(getResourceBySlug(first!.slug)).toEqual(first);
      expect(getResourceBySlug('does-not-exist')).toBeUndefined();
    });
  });

  describe('treatments and research programmes', () => {
    it('uses only known therapeutic areas and development stages', () => {
      for (const item of [...treatments, ...researchPrograms]) {
        expect(THERAPEUTIC_AREAS).toContain(item.therapeuticArea);
        expect(DEVELOPMENT_STAGES).toContain(item.stage);
      }
    });

    it('has unique slugs within each collection', () => {
      expect(new Set(treatments.map((t) => t.slug)).size).toBe(treatments.length);
      expect(new Set(researchPrograms.map((p) => p.slug)).size).toBe(researchPrograms.length);
    });
  });
});
