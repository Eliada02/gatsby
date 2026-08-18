import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Layout } from './Layout';
import { MAIN_CONTENT_ID } from './constants';

const renderLayout = () =>
  render(
    <Layout>
      <h1>Platform</h1>
      <p>Page content.</p>
    </Layout>,
  );

describe('Layout', () => {
  it('provides exactly one of each page landmark', () => {
    // Duplicated or missing landmarks are the most common structural
    // accessibility defect, and they are invisible without a screen reader.
    renderLayout();

    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('has a single navigation landmark in the header and one in the footer', () => {
    renderLayout();

    const navs = screen.getAllByRole('navigation');
    expect(navs.map((nav) => nav.getAttribute('aria-label'))).toEqual(['Main', 'Footer']);
  });

  describe('skip link', () => {
    it('is the first element reached by the keyboard', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.tab();

      expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
    });

    it('targets the main landmark', () => {
      renderLayout();

      const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
      expect(skipLink).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
      expect(screen.getByRole('main')).toHaveAttribute('id', MAIN_CONTENT_ID);
    });

    it('targets a main element that can actually receive focus', () => {
      // Without tabindex="-1" several browsers scroll to the target but leave
      // focus where it was, so the next Tab lands back in the navigation the
      // user just skipped. That is what makes most skip links useless.
      renderLayout();

      expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    });
  });

  it('states that the company is fictional', () => {
    // The site shows clinical-looking content and a security capability list.
    // The disclaimer is a content requirement, so it is asserted like one.
    renderLayout();

    expect(screen.getByText(/NovaHealth is a fictional company/i)).toBeInTheDocument();
  });

  it('renders page content inside main', () => {
    renderLayout();

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Platform' }),
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLayout();

    expect(await axe(container)).toHaveNoViolations();
  });
});
