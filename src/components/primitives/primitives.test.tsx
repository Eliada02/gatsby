import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Container } from './Container';
import { Section } from './Section';
import { VisuallyHidden } from './VisuallyHidden';

describe('Container', () => {
  it('renders its children', () => {
    render(
      <Container>
        <p>Contained copy</p>
      </Container>,
    );

    expect(screen.getByText('Contained copy')).toBeInTheDocument();
  });

  it('adds no landmark role of its own', () => {
    // Layout wrappers must stay semantically invisible. A div that claimed a
    // role would add a landmark for screen reader users to navigate past.
    const { container } = render(
      <Container>
        <p>Copy</p>
      </Container>,
    );

    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.firstElementChild).not.toHaveAttribute('role');
  });
});

describe('Section', () => {
  it('is not exposed as a landmark when it has no accessible name', () => {
    // This is correct HTML behaviour and worth pinning: an unnamed <section>
    // has a generic role, so it never appears in a landmark list. Asserting it
    // documents why aria-labelledby matters.
    render(
      <Section>
        <p>Unnamed band</p>
      </Section>,
    );

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('becomes a named region when labelled by its heading', () => {
    render(
      <Section aria-labelledby="platform-heading">
        <h2 id="platform-heading">Platform</h2>
      </Section>,
    );

    expect(screen.getByRole('region', { name: 'Platform' })).toBeInTheDocument();
  });

  it('opts dark tones into the inverse focus ring', () => {
    // Asserting a class rather than a computed style because jsdom does not
    // resolve custom properties. The class is the mechanism that keeps the
    // focus ring visible on navy backgrounds, where the default sky-600 ring
    // drops to roughly 1.2:1 — a regression that is invisible in review.
    const { container, rerender } = render(<Section tone="dark">Dark</Section>);
    expect(container.firstElementChild).toHaveClass('nh-on-dark');

    rerender(<Section tone="surface">Light</Section>);
    expect(container.firstElementChild).not.toHaveClass('nh-on-dark');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Section aria-labelledby="s">
        <h2 id="s">Heading</h2>
        <p>Body</p>
      </Section>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('VisuallyHidden', () => {
  it('keeps its content in the accessibility tree', () => {
    // The whole point of the component: invisible on screen, still announced.
    // display:none or visibility:hidden would fail this assertion.
    render(<VisuallyHidden>Skip to results</VisuallyHidden>);

    expect(screen.getByText('Skip to results')).toBeVisible();
  });

  it('can render as a heading so a section gains a name without a visible title', () => {
    render(
      <Section aria-labelledby="hidden-heading">
        <VisuallyHidden as="h2">
          <span id="hidden-heading">Trusted networks</span>
        </VisuallyHidden>
      </Section>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Trusted networks' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trusted networks' })).toBeInTheDocument();
  });
});
