import type { HeadFC } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/patterns/PageHero';
import { PointsList } from '@/components/patterns/PointsList';
import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { FinalCta } from '@/components/sections/FinalCta';
import { SecurityPreview } from '@/components/sections/SecurityPreview';
import { Seo } from '@/components/seo/Seo';
import { homeContent, securityContent, securityPractices } from '@/lib/content/source';
import * as styles from './security.module.css';

const DATA_HEADING_ID = 'site-data-heading';

/**
 * Security and trust.
 *
 * The practices band is the same component the home page uses, reading the same
 * collection. Restating the practices in page markup would give the site two
 * places to edit and one of them would be missed.
 *
 * The second band is about this website rather than the product: consent,
 * what analytics carry, server-side validation and third-party scripts. Every
 * point in it describes behaviour that exists in the repository, which is the
 * only kind of security statement a demonstration project can honestly make.
 */
const SecurityPage = () => (
  <Layout>
    <PageHero
      eyebrow={securityContent.hero.eyebrow}
      heading={securityContent.hero.heading}
      summary={securityContent.hero.summary}
    />

    <SecurityPreview intro={homeContent.security} practices={securityPractices} />

    <Section tone="canvas" aria-labelledby={DATA_HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={DATA_HEADING_ID}
          eyebrow={securityContent.dataHandling.eyebrow}
          heading={securityContent.dataHandling.heading}
          summary={securityContent.dataHandling.summary}
        />

        <PointsList points={securityContent.dataHandling.points} />

        <p className={styles.footnote}>{securityContent.footnote}</p>
      </Container>
    </Section>

    <FinalCta content={homeContent.finalCta} />
  </Layout>
);

export default SecurityPage;

export const Head: HeadFC = ({ location }) => (
  <Seo
    pathname={location.pathname}
    title="Security & Trust"
    description="How NovaHealth approaches encrypted data, role-based access, audit logging and FHIR-ready interoperability, and how this site handles your data."
  />
);
