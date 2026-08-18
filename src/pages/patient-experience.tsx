import type { HeadFC } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Seo } from '@/components/seo/Seo';

/**
 * Route shell. Sections are built out in a later phase; the structure, landmark
 * placement and metadata are correct from the start so navigation and heading
 * order can be tested now rather than retrofitted.
 */
const PatientExperiencePage = () => (
  <Layout>
    <Section aria-labelledby="patient-experience-heading">
      <Container>
        <h1 id="patient-experience-heading">From first symptom to full recovery</h1>
        <p>
          A single care path replaces disconnected portals and repeated paperwork, so people spend
          less time managing their care and more time receiving it.
        </p>
      </Container>
    </Section>
  </Layout>
);

export default PatientExperiencePage;

export const Head: HeadFC = () => (
  <Seo
    title="Patient Experience"
    description="How NovaHealth connects discovery, booking, intake, consultation and recovery into one continuous patient journey."
  />
);
