import type { HeadFC } from 'gatsby';
import { Layout } from '@/components/layout/Layout';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Seo } from '@/components/seo/Seo';

/**
 * The 404 page offers a route onward rather than only stating the failure. It
 * is also marked noindex in a later phase, so a mistyped URL cannot end up in
 * search results.
 */
const NotFoundPage = () => (
  <Layout>
    <Section aria-labelledby="not-found-heading">
      <Container size="narrow">
        <h1 id="not-found-heading">We could not find that page</h1>
        <p>
          The link may be out of date, or the page may have moved. The resource library is the best
          place to start looking.
        </p>
        <p>
          <ButtonLink to="/resources" variant="primary" withArrow>
            Browse the resource library
          </ButtonLink>
        </p>
      </Container>
    </Section>
  </Layout>
);

export default NotFoundPage;

/**
 * noindex, because a mistyped URL should never become a search result — and
 * without structured data, because there is no content here to describe. The
 * page still links onward, so `follow` is correct: a crawler that lands here
 * should keep going.
 */
export const Head: HeadFC = ({ location }) => (
  <Seo
    title="Page not found"
    description="The page you requested could not be found. The resource library is the best place to start looking."
    pathname={location.pathname}
    noIndex
  />
);
