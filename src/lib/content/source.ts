import type { Author, ResearchProgram, Resource, Treatment } from '@/types/content';
import authorsJson from '../../../content/authors.json';
import researchJson from '../../../content/research.json';
import resourcesJson from '../../../content/resources.json';
import treatmentsJson from '../../../content/treatments.json';

/**
 * The single point at which content enters the application.
 *
 * Everything downstream - the REST handlers, the build-time page generation and
 * the UI - reads content from here rather than importing JSON directly. Moving
 * to a headless CMS therefore means rewriting this one module: replace the
 * imports with a CMS fetch, keep the exported shape, and nothing else changes.
 *
 * The casts are deliberate. TypeScript infers `category: string` from JSON,
 * which is wider than `ResourceCategory`. Rather than validating at import time
 * on every page load, the invariants are asserted once in source.test.ts and
 * enforced in CI. When this module is swapped for a real CMS the data becomes
 * genuinely untrusted, and validation moves to runtime at that boundary.
 */

export const authors = authorsJson as readonly Author[];
export const resources = resourcesJson as readonly Resource[];
export const treatments = treatmentsJson as readonly Treatment[];
export const researchPrograms = researchJson as readonly ResearchProgram[];

export function getAuthorById(id: string): Author | undefined {
  return authors.find((author) => author.id === id);
}

/** Resolves author references, silently dropping ids with no matching author. */
export function getAuthorsByIds(ids: readonly string[]): Author[] {
  return ids.map(getAuthorById).filter((author): author is Author => author !== undefined);
}

export function getResourceBySlug(slug: string): Resource | undefined {
  return resources.find((resource) => resource.slug === slug);
}

export function getTreatmentBySlug(slug: string): Treatment | undefined {
  return treatments.find((treatment) => treatment.slug === slug);
}
