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
const SecurityPage = () => (
  <Layout>
    <Section aria-labelledby="security-heading">
      <Container>
        <h1 id="security-heading">Security and trust by design</h1>
        <p>
          Health data carries a duty of care. Our architecture treats encryption, least-privilege
          access and auditability as design constraints rather than features added later.
        </p>
      </Container>
    </Section>
  </Layout>
);

export default SecurityPage;

export const Head: HeadFC = () => (
  <Seo
    title="Security & Trust"
    description="How NovaHealth approaches encrypted data, role-based access, audit logging and FHIR-ready interoperability."
  />
);
