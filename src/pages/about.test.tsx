import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { aboutContent } from '@/lib/content/source';
import { FOOTER_NAV } from '@/lib/navigation';
import AboutPage from './about';

/**
 * The About & Contact page.
 *
 * The form's own behaviour is tested with the component. These assertions are
 * about the page: that it says what the project is, and that the anchor every
 * "Contact us" link on the site points at actually exists here.
 */
describe('About page', () => {
  it('tells the story from the content source rather than from markup', () => {
    render(<AboutPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(aboutContent.hero.heading);
    for (const paragraph of aboutContent.story.paragraphs) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    for (const point of aboutContent.principles.points) {
      expect(screen.getByRole('heading', { name: point.title })).toBeInTheDocument();
    }
  });

  it('provides the #contact anchor the rest of the site links to', () => {
    // The header, the mobile menu, the impact model and the closing call to
    // action all point at /about#contact. A missing id silently drops the
    // reader at the top of the page instead.
    const { container } = render(<AboutPage />);

    const target = container.querySelector('#contact');
    expect(target).not.toBeNull();
    expect(target).toHaveAccessibleName(aboutContent.contact.heading);

    const contactLinks = FOOTER_NAV.flatMap((group) => group.items).filter((item) =>
      item.to.includes('#contact'),
    );
    expect(contactLinks.length).toBeGreaterThan(0);
  });

  it('carries the contact form inside the contact section', () => {
    const { container } = render(<AboutPage />);

    expect(container.querySelector('#contact form')).not.toBeNull();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('says what happens to a message before anyone types one', () => {
    render(<AboutPage />);

    expect(screen.getByText(aboutContent.contact.note)).toBeInTheDocument();
    expect(screen.getByText(/not forwarded to a mailbox/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AboutPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
