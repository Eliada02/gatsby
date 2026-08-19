import type { Author, ResearchProgram, Resource, Treatment } from '@/types/content';
import type {
  AboutPageContent,
  HomeContent,
  JourneyStage,
  PlatformCapability,
  SecurityPageContent,
  SecurityPractice,
} from '@/types/site';
import aboutJson from '../../../content/about.json';
import authorsJson from '../../../content/authors.json';
import capabilitiesJson from '../../../content/capabilities.json';
import homeJson from '../../../content/home.json';
import journeyJson from '../../../content/journey.json';
import researchJson from '../../../content/research.json';
import resourcesJson from '../../../content/resources.json';
import securityJson from '../../../content/security.json';
import securityPracticesJson from '../../../content/security-practices.json';
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

/* ---- Editorial catalogue ---- */

export const authors = authorsJson as readonly Author[];
export const resources = resourcesJson as readonly Resource[];
export const treatments = treatmentsJson as readonly Treatment[];
export const researchPrograms = researchJson as readonly ResearchProgram[];

/* ---- Site content ---- */

/**
 * Rendered in summary on the home page and in full on their own pages later.
 * Sourced once so the two never disagree.
 */
export const journeyStages = journeyJson as readonly JourneyStage[];
export const platformCapabilities = capabilitiesJson as readonly PlatformCapability[];
export const securityPractices = securityPracticesJson as readonly SecurityPractice[];

export const homeContent = homeJson as HomeContent;

/**
 * Copy for the two content pages that are not compositions of home-page bands.
 * The security practices themselves stay in their own collection, because the
 * home page and the security page render the same list.
 */
export const securityContent = securityJson as SecurityPageContent;
export const aboutContent = aboutJson as AboutPageContent;

/* ---- Lookups ---- */

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
