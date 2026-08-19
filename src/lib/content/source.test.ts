import {
  RESOURCE_CATEGORIES,
  RESOURCE_FORMATS,
  DEVELOPMENT_STAGES,
  THERAPEUTIC_AREAS,
} from '@/types/content';
import {
  aboutContent,
  authors,
  getAuthorsByIds,
  getResourceBySlug,
  homeContent,
  journeyStages,
  platformCapabilities,
  researchPrograms,
  resources,
  securityContent,
  securityPractices,
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

    it('makes no certification or regulatory approval claim', () => {
      // The library is the easiest place for a marketing claim to slip in.
      // Certification and approval are legal statuses a fictional company
      // cannot hold, so CI rejects them rather than relying on review.
      const forbidden = /hipaa|soc ?2|iso ?27001|fda[- ]approved|certified|accredited/i;

      for (const resource of resources) {
        expect(resource.title + ' ' + resource.summary + ' ' + resource.body).not.toMatch(
          forbidden,
        );
      }
    });

    it('names no real healthcare organisation or vendor', () => {
      // Naming a real provider or EHR vendor implies a partnership or customer
      // relationship that does not exist.
      const realNames =
        /stanford|mayo clinic|mount sinai|cleveland clinic|kaiser|epic systems|cerner|athenahealth|nhs/i;

      for (const resource of resources) {
        expect(resource.title + ' ' + resource.summary + ' ' + resource.body).not.toMatch(
          realNames,
        );
      }
    });

    it('populates every field the library and detail page render', () => {
      // A missing summary or body renders as an empty card or an empty article
      // rather than throwing, so absence has to be asserted explicitly.
      for (const resource of resources) {
        expect(resource.title.trim()).not.toBe('');
        expect(resource.summary.trim()).not.toBe('');
        expect(resource.body.trim()).not.toBe('');
        expect(resource.slug).toMatch(/^[a-z0-9-]+$/);
        expect(resource.readingTimeMinutes).toBeGreaterThan(0);
        expect(resource.tags.length).toBeGreaterThan(0);
      }
    });

    it('holds enough entries across enough categories to exercise the library', () => {
      // Search, filtering and pagination are only meaningfully demonstrable
      // with more entries than fit on one page.
      expect(resources.length).toBeGreaterThanOrEqual(12);
      expect(new Set(resources.map((r) => r.category)).size).toBeGreaterThanOrEqual(4);
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

  describe('site content', () => {
    it('numbers the journey stages consecutively from one', () => {
      // The visible stage numbers come from this field. A gap or a duplicate
      // would render as "Stage 04" twice with no compile-time complaint.
      const orders = journeyStages.map((stage) => stage.order);

      expect(orders).toEqual(journeyStages.map((_stage, index) => index + 1));
    });

    it('gives every collection unique ids', () => {
      for (const collection of [journeyStages, platformCapabilities, securityPractices]) {
        expect(new Set(collection.map((item) => item.id)).size).toBe(collection.length);
      }
    });

    it('uses only known accent values for platform capabilities', () => {
      for (const capability of platformCapabilities) {
        expect(['sky', 'emerald', 'teal']).toContain(capability.accent);
      }
    });

    it('claims no certifications in the security practices', () => {
      // The design reference presented HIPAA, SOC 2 and "zero-knowledge" as
      // badges. For a fictional company those are false claims of audited
      // status, so this asserts they cannot reappear through a content edit.
      const forbidden = /hipaa|soc\s*2|iso\s*27001|certified|compliant|accredited/i;

      for (const practice of securityPractices) {
        expect(practice.title + ' ' + practice.description).not.toMatch(forbidden);
      }
    });

    it('labels the illustrative figures on the home page as illustrative', () => {
      // Hero metrics and the impact model must never read as measured results.
      expect(homeContent.hero.metricsNote).toMatch(/illustrative/i);
      expect(homeContent.impact.disclaimer).toMatch(/illustrative/i);
      expect(homeContent.trust.disclaimer).toMatch(/fictional/i);
      expect(homeContent.portal.caption).toMatch(/demo data/i);
    });

    it('names no real organisation in the credibility band', () => {
      const realOrganisations = /stanford|mayo|sinai|cleveland|kaiser|nhs|epic|cerner/i;

      for (const organisation of homeContent.trust.organisations) {
        expect(organisation.name).not.toMatch(realOrganisations);
      }
    });
  });
});

/**
 * Page copy for the security and about pages.
 *
 * Held to the same standard as the collections: it is the copy a reader checks
 * before deciding whether to trust the product, and it is written in a file
 * rather than in a component precisely so it can be checked here.
 */
describe('content page copy', () => {
  it('populates every field the security page renders', () => {
    expect(securityContent.hero.heading.trim()).not.toBe('');
    expect(securityContent.hero.summary.trim()).not.toBe('');
    expect(securityContent.dataHandling.points.length).toBeGreaterThan(0);
    expect(securityContent.footnote.trim()).not.toBe('');

    for (const point of securityContent.dataHandling.points) {
      expect(point.title.trim()).not.toBe('');
      expect(point.description.trim()).not.toBe('');
    }
  });

  it('populates every field the about page renders', () => {
    expect(aboutContent.hero.heading.trim()).not.toBe('');
    expect(aboutContent.story.paragraphs.length).toBeGreaterThan(0);
    expect(aboutContent.principles.points.length).toBeGreaterThan(0);
    expect(aboutContent.contact.heading.trim()).not.toBe('');
    expect(aboutContent.contact.note.trim()).not.toBe('');
  });

  it('gives every point a unique id', () => {
    for (const collection of [
      securityContent.dataHandling.points,
      aboutContent.principles.points,
    ]) {
      expect(new Set(collection.map((point) => point.id)).size).toBe(collection.length);
    }
  });

  it('claims no certification or audited status on the security page', () => {
    // The same guard the practices collection has. A page-level claim would
    // otherwise slip past it.
    const forbidden = /hipaa|soc\s*2|iso\s*27001|certified|accredited|guarantee[sd]?\b/i;
    const copy = [
      securityContent.hero.summary,
      securityContent.dataHandling.summary ?? '',
      ...securityContent.dataHandling.points.map((point) => `${point.title} ${point.description}`),
    ].join(' ');

    expect(copy).not.toMatch(forbidden);
  });

  it('states on the contact page that nothing is delivered', () => {
    // A fictional company must not imply that a reply is coming.
    expect(aboutContent.contact.note).toMatch(/fictional/i);
    expect(aboutContent.contact.note).toMatch(/not forwarded|no mailbox|not sent/i);
  });
});
