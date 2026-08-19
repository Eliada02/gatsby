import type { HeadFC } from 'gatsby';
import { ContactSection } from '@/components/contact/ContactSection';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/patterns/PageHero';
import { PointsList } from '@/components/patterns/PointsList';
import { SectionHeader } from '@/components/patterns/SectionHeader';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { AboutStory } from '@/components/sections/AboutStory';
import { Seo } from '@/components/seo/Seo';
import { aboutContent } from '@/lib/content/source';

const PRINCIPLES_HEADING_ID = 'about-principles-heading';

/**
 * About and contact.
 *
 * One page rather than two, because the navigation, the footer and every
 * closing call to action point at /about#contact. Splitting them would leave
 * those links either wrong or pointing at a page with one form on it.
 */
const AboutPage = () => (
  <Layout>
    <PageHero
      eyebrow={aboutContent.hero.eyebrow}
      heading={aboutContent.hero.heading}
      summary={aboutContent.hero.summary}
    />

    <AboutStory content={aboutContent.story} />

    <Section tone="canvas" aria-labelledby={PRINCIPLES_HEADING_ID}>
      <Container>
        <SectionHeader
          headingId={PRINCIPLES_HEADING_ID}
          eyebrow={aboutContent.principles.eyebrow}
          heading={aboutContent.principles.heading}
          summary={aboutContent.principles.summary}
        />

        <PointsList points={aboutContent.principles.points} />
      </Container>
    </Section>

    <ContactSection content={aboutContent.contact} />
  </Layout>
);

export default AboutPage;

export const Head: HeadFC = ({ location }) => (
  <Seo
    pathname={location.pathname}
    title="About & Contact"
    description="About NovaHealth, the thinking behind the platform, and how to start a conversation with the team."
  />
);
