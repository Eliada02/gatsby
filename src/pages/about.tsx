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
const AboutPage = () => (
  <Layout>
    <Section aria-labelledby="about-heading">
      <Container>
        <h1 id="about-heading">Built by people who have waited in the same queues</h1>
        <p>
          NovaHealth is a demonstration of what a modern, human-centred health platform can look
          like when accessibility and clarity come first.
        </p>
      </Container>
    </Section>
  </Layout>
);

export default AboutPage;

export const Head: HeadFC = () => (
  <Seo
    title="About & Contact"
    description="About NovaHealth, the thinking behind the platform, and how to start a conversation with the team."
  />
);
