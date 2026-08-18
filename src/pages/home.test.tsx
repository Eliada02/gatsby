import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { journeyStages, securityPractices } from '@/lib/content/source';
import IndexPage from './index';

/**
 * Home page composition.
 *
 * Section internals are tested with their components; these assertions are
 * about the page as a whole — document outline, landmark structure and the
 * claims the page makes.
 */
describe('Home page', () => {
  it('has one h1 and no skipped heading levels', () => {
    // A jump from h1 to h3 breaks navigation for anyone moving through a page
    // by heading, and it is invisible on screen.
    render(<IndexPage />);

    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.substring(1)));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);

    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('exposes each content band as a named region', () => {
    // Named regions are what let a screen reader user jump between sections
    // instead of reading the page linearly.
    render(<IndexPage />);

    const regions = screen.getAllByRole('region');

    expect(regions.length).toBeGreaterThanOrEqual(5);
    // A region with no accessible name is not announced as one, so every band
    // must resolve a name through aria-labelledby.
    for (const region of regions) {
      expect(region).toHaveAccessibleName();
    }
  });

  it('presents the care journey as an ordered sequence', () => {
    render(<IndexPage />);
    const journey = screen.getByRole('region', { name: /from first symptom to full recovery/i });

    const items = within(journey).getAllByRole('listitem');
    expect(items).toHaveLength(journeyStages.length);
    expect(within(journey).getByRole('list').tagName).toBe('OL');
  });

  it('renders every security practice without claiming certification', () => {
    render(<IndexPage />);
    const security = screen.getByRole('region', {
      name: /health data deserves a higher standard/i,
    });

    for (const practice of securityPractices) {
      expect(within(security).getByRole('heading', { name: practice.title })).toBeInTheDocument();
    }
    expect(within(security).getByText(/holds no certifications/i)).toBeInTheDocument();
  });

  it('frames the portal preview as demo data before the invented values', () => {
    // The caption must precede the fake clinical values in the accessibility
    // tree, or a screen reader reads a plausible-looking patient record with no
    // indication that it is fabricated.
    render(<IndexPage />);

    const figure = screen.getByRole('figure');
    const caption = within(figure).getByText(/invented demo data/i);
    const patientLine = within(figure).getByText(/welcome back/i);

    expect(
      caption.compareDocumentPosition(patientLine) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('marks the hero metrics as illustrative', () => {
    render(<IndexPage />);

    expect(screen.getByText(/illustrative product targets/i)).toBeInTheDocument();
  });

  it('states that the credibility band lists fictional organisations', () => {
    render(<IndexPage />);

    expect(screen.getByText(/fictional examples created for this demonstration/i)).toBeVisible();
  });

  it('uses links for every call to action, since they all navigate', () => {
    render(<IndexPage />);

    for (const label of [
      /explore the platform/i,
      /see how it works/i,
      /start a conversation/i,
      /talk to us about your team/i,
    ]) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<IndexPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
