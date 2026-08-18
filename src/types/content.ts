/**
 * Content model for NovaHealth.
 *
 * These types describe content as a headless CMS would return it, not as any
 * particular component wants to consume it. Fields use CMS conventions:
 * references by id rather than embedded objects, ISO date strings rather than
 * Date instances, and media as objects rather than bare URLs. Replacing the
 * JSON files in /content with a CMS should not require changing this file.
 */

/** ISO 8601 calendar date, e.g. "2026-06-12". Sortable as a string, timezone-free. */
export type ISODate = string;

/** URL-safe identifier, also used as the CMS slug and the route segment. */
export type Slug = string;

/**
 * `alt` is required rather than optional. A decorative image must declare
 * `alt: ""` explicitly, which makes the decision visible in the content itself
 * instead of allowing an accidental omission.
 */
export interface Media {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  /** Post-nominal qualifications, e.g. "MD, PhD". Signals authority in a clinical context. */
  credentials?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  noIndex?: boolean;
}

/**
 * Declared as a const array so the same source drives both the runtime filter
 * options and the compile-time union below. Adding a category in one place
 * updates both, and an unknown value fails type-checking.
 */
export const RESOURCE_CATEGORIES = [
  'clinical-research',
  'patient-resources',
  'scientific-publications',
  'medical-education',
  'company-insights',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  'clinical-research': 'Clinical Research',
  'patient-resources': 'Patient Resources',
  'scientific-publications': 'Scientific Publications',
  'medical-education': 'Medical Education',
  'company-insights': 'Company Insights',
};

export const RESOURCE_FORMATS = ['article', 'pdf', 'video', 'infographic', 'guide'] as const;

export type ResourceFormat = (typeof RESOURCE_FORMATS)[number];

export interface Resource {
  id: string;
  slug: Slug;
  title: string;
  /** Shown in listings. Kept separate from `body` so cards never truncate prose. */
  summary: string;
  /** Markdown, rendered on the detail page only. */
  body: string;
  category: ResourceCategory;
  format: ResourceFormat;
  tags: string[];
  publishedAt: ISODate;
  updatedAt?: ISODate;
  readingTimeMinutes: number;
  /** References, not embedded objects, matching how a CMS models relations. */
  authorIds: string[];
  heroImage?: Media;
  /** Presence of a download drives both the CTA and the resource_download event. */
  downloadUrl?: string;
  fileSizeKb?: number;
  seo?: SeoMeta;
}

export const THERAPEUTIC_AREAS = [
  'oncology',
  'immunology',
  'neuroscience',
  'rare-disease',
] as const;

export type TherapeuticArea = (typeof THERAPEUTIC_AREAS)[number];

export const THERAPEUTIC_AREA_LABELS: Record<TherapeuticArea, string> = {
  oncology: 'Oncology',
  immunology: 'Immunology',
  neuroscience: 'Neuroscience',
  'rare-disease': 'Rare Disease',
};

/** Development stages, ordered from earliest to latest. */
export const DEVELOPMENT_STAGES = [
  'preclinical',
  'phase-i',
  'phase-ii',
  'phase-iii',
  'approved',
] as const;

export type DevelopmentStage = (typeof DEVELOPMENT_STAGES)[number];

export const DEVELOPMENT_STAGE_LABELS: Record<DevelopmentStage, string> = {
  preclinical: 'Preclinical',
  'phase-i': 'Phase I',
  'phase-ii': 'Phase II',
  'phase-iii': 'Phase III',
  approved: 'Approved',
};

export interface Treatment {
  id: string;
  slug: Slug;
  name: string;
  /** Non-proprietary name, as required on real pharmaceutical materials. */
  genericName?: string;
  /** The condition the treatment addresses. */
  indication: string;
  therapeuticArea: TherapeuticArea;
  stage: DevelopmentStage;
  mechanismOfAction: string;
  summary: string;
  keyFacts: Array<{ label: string; value: string }>;
}

export interface ResearchProgram {
  id: string;
  slug: Slug;
  title: string;
  therapeuticArea: TherapeuticArea;
  stage: DevelopmentStage;
  summary: string;
  /** What the programme is investigating, in plain language. */
  focus: string;
  milestones: Array<{ year: number; description: string }>;
}
