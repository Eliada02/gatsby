import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { securityContent, securityPractices } from '@/lib/content/source';
import SecurityPage from './security';

/**
 * The Security & Trust page.
 *
 * Two claims are being defended here. The first is that the page renders the
 * securityPractices collection rather than a second copy of the same words in
 * page markup: a duplicate would drift the moment one of them was edited.
 *
 * The second is that nothing on the page asserts a status a fictional company
 * cannot hold. The content tests already guard the collection; this guards the
 * page, including any copy written directly into it.
 */
describe('Security page', () => {
  it('renders every practice from the collection', () => {
    render(<SecurityPage />);

    for (const practice of securityPractices) {
      expect(screen.getByRole('heading', { name: practice.title })).toBeInTheDocument();
      expect(screen.getByText(practice.description)).toBeInTheDocument();
    }
  });

  it('renders the practices as a list, so their number is announced', () => {
    render(<SecurityPage />);
    const practices = screen.getByRole('region', {
      name: /health data deserves a higher standard/i,
    });

    expect(within(practices).getAllByRole('listitem')).toHaveLength(securityPractices.length);
  });

  it('explains how the site itself handles data', () => {
    render(<SecurityPage />);

    for (const point of securityContent.dataHandling.points) {
      expect(screen.getByRole('heading', { name: point.title })).toBeInTheDocument();
    }
  });

  it('states that it holds no certifications and processes no real patient data', () => {
    render(<SecurityPage />);

    expect(screen.getByText(/holds no certifications/i)).toBeInTheDocument();
    expect(screen.getByText(securityContent.footnote)).toBeInTheDocument();
  });

  it('claims no certification, compliance or audited status', () => {
    // The page a reader would check before trusting the product is the page a
    // marketing claim is most likely to appear on.
    const { container } = render(<SecurityPage />);
    const text = container.textContent ?? '';

    for (const claim of [
      /hipaa/i,
      /soc\s*2/i,
      /iso\s*27001/i,
      /\bcertified\b/i,
      /\baccredited\b/i,
    ]) {
      expect(text).not.toMatch(claim);
    }
  });

  it('exposes each band as a named region', () => {
    render(<SecurityPage />);

    for (const region of screen.getAllByRole('region')) {
      expect(region).toHaveAccessibleName();
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SecurityPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
