import type { HeadFC } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { FinalCta } from '@/components/sections/FinalCta';
import { Hero } from '@/components/sections/Hero';
import { ImpactCalculator } from '@/components/sections/ImpactCalculator';
import { PatientJourney } from '@/components/sections/PatientJourney';
import { PlatformOverview } from '@/components/sections/PlatformOverview';
import { SecurityPreview } from '@/components/sections/SecurityPreview';
import { TrustBar } from '@/components/sections/TrustBar';
import { Seo } from '@/components/seo/Seo';
import {
  homeContent,
  journeyStages,
  platformCapabilities,
  securityPractices,
} from '@/lib/content/source';

/**
 * The home page is composition only.
 *
 * Content is read here and passed down as props; no section reaches for the
 * content module itself. That is what keeps the sections reusable on other
 * pages and testable with fixtures, and it is the seam that lets the source
 * become a CMS or a REST call without touching a single section.
 */
const IndexPage = () => (
  <Layout>
    <Hero content={homeContent.hero} portal={homeContent.portal} />
    <TrustBar content={homeContent.trust} />
    <PatientJourney intro={homeContent.journey} stages={journeyStages} />
    <PlatformOverview intro={homeContent.platform} capabilities={platformCapabilities} />
    <ImpactCalculator content={homeContent.impact} />
    <SecurityPreview intro={homeContent.security} practices={securityPractices} />
    <FinalCta content={homeContent.finalCta} />
  </Layout>
);

export default IndexPage;

export const Head: HeadFC = () => (
  <Seo
    title="NovaHealth - Healthcare, designed around people"
    description="A connected digital health experience: smart scheduling, unified records and care team messaging, built around the person receiving care."
    appendSiteName={false}
  />
);
