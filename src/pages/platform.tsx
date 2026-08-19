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
const PlatformPage = () => (
  <Layout>
    <Section aria-labelledby="platform-heading">
      <Container>
        <h1 id="platform-heading">The unified digital health workspace</h1>
        <p>
          One workspace for patients, clinicians and health system administrators, with records that
          stay in step across every team involved in their care.
        </p>
      </Container>
    </Section>
  </Layout>
);

export default PlatformPage;

export const Head: HeadFC = ({ location }) => (
  <Seo
    pathname={location.pathname}
    title="Platform"
    description="A unified digital health workspace for patients, clinicians and administrators, with interoperable records and scheduling."
  />
);
