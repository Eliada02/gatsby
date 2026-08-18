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
const ResourcesPage = () => (
  <Layout>
    <Section aria-labelledby="resources-heading">
      <Container>
        <h1 id="resources-heading">Resource library</h1>
        <p>
          Clinical research, patient guides, scientific publications and educational material,
          searchable by topic and format.
        </p>
      </Container>
    </Section>
  </Layout>
);

export default ResourcesPage;

export const Head: HeadFC = () => (
  <Seo
    title="Resources"
    description="Search and filter clinical research, patient resources, scientific publications and medical education material."
  />
);
