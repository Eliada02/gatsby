/**
 * Marketing site content.
 *
 * Kept separate from content.ts, which models the editorial catalogue
 * (resources, treatments, research). In a real CMS these would be different
 * content types owned by different people: catalogue entries by medical
 * communications, the copy below by marketing.
 *
 * The reusable collections here are deliberately not home-page-specific. The
 * journey stages, capabilities and security practices are each rendered in
 * summary on the home page and in full on their own page later, from the same
 * source.
 */

/** A call to action. `to` is an internal route; ButtonLink handles the rest. */
export interface Cta {
  label: string;
  to: string;
}

/**
 * A figure shown beside the hero.
 *
 * These are product characteristics, not performance claims. The reference used
 * fabricated statistics ("98% satisfaction", "99.9% uptime SLA") which would
 * read as real results for a real company.
 */
export interface HeroMetric {
  value: string;
  label: string;
}

/** A fictional organisation shown in the credibility band. */
export interface Organisation {
  id: string;
  name: string;
}

/** One step of the connected care journey, rendered as an ordered sequence. */
export interface JourneyStage {
  id: string;
  /** 1-based position, used for the visible stage number. */
  order: number;
  title: string;
  description: string;
}

/** A capability of the platform, shown on the dark band. */
export interface PlatformCapability {
  id: string;
  title: string;
  description: string;
  /** Short supporting line, styled as an accented note. */
  note: string;
  /** Tints the note. Purely presentational, chosen per capability by content. */
  accent: 'sky' | 'emerald' | 'teal';
}

/**
 * A security practice.
 *
 * These describe architectural approach, never certification. The reference
 * asserted "HIPAA Compliant", "SOC 2 Type II" and "Zero-Knowledge Vaults" as
 * badges, which would be false claims of audited status for a fictional
 * company.
 */
export interface SecurityPractice {
  id: string;
  title: string;
  description: string;
}

/** A titled band with an optional eyebrow label above the heading. */
export interface SectionIntro {
  eyebrow?: string;
  heading: string;
  summary?: string;
}

export interface HeroContent {
  eyebrow: string;
  /**
   * Split so the closing phrase can be accented without the component parsing
   * prose, which would break as soon as the copy changed.
   */
  headingStart: string;
  headingAccent: string;
  summary: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  metrics: HeroMetric[];
  metricsNote: string;
}

/** Content of the illustrative patient portal preview shown beside the hero. */
export interface PortalPreview {
  caption: string;
  patientName: string;
  recordLine: string;
  coverage: string;
  syncLabel: string;
  appointment: { label: string; clinician: string; detail: string; tags: string[] };
  vitals: { label: string; status: string; detail: string; note: string };
  prescriptions: Array<{ id: string; name: string; detail: string; status: string }>;
}

export interface TrustContent extends SectionIntro {
  organisations: Organisation[];
  disclaimer: string;
}

export interface ImpactContent extends SectionIntro {
  sliderLabel: string;
  resultsLabel: string;
  disclaimer: string;
  cta: Cta;
}

export interface FinalCtaContent {
  heading: string;
  summary: string;
  primaryCta: Cta;
  secondaryCta: Cta;
}

/* ---- Content pages ---- */

/** The opening band of a content page: eyebrow badge, h1 and a lead paragraph. */
export interface PageHeroContent {
  eyebrow: string;
  heading: string;
  summary: string;
}

/** A short titled point, rendered as a card in a list. */
export interface ContentPoint {
  id: string;
  title: string;
  description: string;
}

/**
 * How the website itself handles data.
 *
 * Separate from SecurityPractice, which describes the product. Every point here
 * describes behaviour implemented in this repository, so it stays checkable
 * rather than becoming marketing copy.
 */
export interface SecurityDataHandling extends SectionIntro {
  points: ContentPoint[];
}

export interface SecurityPageContent {
  hero: PageHeroContent;
  dataHandling: SecurityDataHandling;
  footnote: string;
}

export interface AboutStory {
  heading: string;
  paragraphs: string[];
}

export interface AboutPrinciples extends SectionIntro {
  points: ContentPoint[];
}

export interface ContactIntro {
  heading: string;
  summary: string;
  /** Shown with the form, stating what does and does not happen to a message. */
  note: string;
}

export interface AboutPageContent {
  hero: PageHeroContent;
  story: AboutStory;
  principles: AboutPrinciples;
  contact: ContactIntro;
}

export interface HomeContent {
  hero: HeroContent;
  portal: PortalPreview;
  trust: TrustContent;
  journey: SectionIntro;
  platform: SectionIntro;
  impact: ImpactContent;
  security: SectionIntro;
  finalCta: FinalCtaContent;
}
