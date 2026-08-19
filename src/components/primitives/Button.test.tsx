import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { setConsent } from '@/lib/analytics/consent';
import { resetPendingEvents } from '@/lib/analytics/dataLayer';
import { Button, ButtonLink } from './Button';

const dataLayer = () => window.dataLayer ?? [];

beforeEach(() => {
  window.localStorage.clear();
  window.dataLayer = [];
  resetPendingEvents();
});

describe('Button', () => {
  it('renders a real button element with an accessible name', () => {
    render(<Button>Contact us</Button>);

    expect(screen.getByRole('button', { name: 'Contact us' })).toBeInTheDocument();
  });

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    // HTML defaults <button> to type="submit". Reusing a styled button inside a
    // form would then submit it on click, which is the classic version of this
    // bug and is invisible until the component is placed in a form.
    render(<Button>Filter</Button>);

    expect(screen.getByRole('button', { name: 'Filter' })).toHaveAttribute('type', 'button');
  });

  it('still allows an explicit submit button', () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('is operable by keyboard', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Open</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();

    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    // A real <button> handles both Enter and Space for free. A div with an
    // onClick handler would fail this test, which is the point of the assertion.
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('exposes the disabled state and blocks activation', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Unavailable
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Unavailable' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides the decorative arrow from assistive technology', () => {
    render(<Button withArrow>Explore NovaHealth</Button>);

    // The accessible name must not become "Explore NovaHealth →".
    expect(screen.getByRole('button', { name: 'Explore NovaHealth' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Accessible</Button>);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ButtonLink', () => {
  it('renders an anchor, not a button, so it is announced as a link', () => {
    render(<ButtonLink to="/platform">Platform</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Platform' });
    expect(link).toHaveAttribute('href', '/platform');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens external links safely and announces the new tab', () => {
    render(<ButtonLink to="https://example.org/report">Read the report</ButtonLink>);

    const link = screen.getByRole('link', { name: /read the report/i });
    expect(link).toHaveAttribute('target', '_blank');
    // Without noopener the new document can reach back via window.opener.
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName('Read the report (opens in a new tab)');
  });

  it('does not force a new tab for mailto links', () => {
    render(<ButtonLink to="mailto:hello@novahealth.example">Email us</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Email us' });
    expect(link).toHaveAttribute('href', 'mailto:hello@novahealth.example');
    expect(link).not.toHaveAttribute('target');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ButtonLink to="/resources">Resources</ButtonLink>);

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * CTA tracking.
 *
 * The prop is the whole API: a call site describes the call to action and the
 * component decides when to record it. These assertions are about the two
 * properties that matter — that measuring never changes what the button does,
 * and that nothing is measured before consent.
 */
describe('CTA tracking', () => {
  it('records nothing when no tracking is configured', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(<Button>Plain</Button>);

    await user.click(screen.getByRole('button', { name: 'Plain' }));

    expect(dataLayer()).toHaveLength(0);
  });

  it('records one cta_click per activation of a button', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(
      <Button
        tracking={{
          name: 'Clear filters',
          location: 'resource_library',
          destination: '/resources',
        }}
      >
        Clear filters
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(dataLayer()).toHaveLength(1);
    expect(dataLayer()[0]).toEqual({
      event: 'cta_click',
      cta_name: 'Clear filters',
      cta_location: 'resource_library',
      destination: '/resources',
    });
  });

  it('does not fire twice for one activation', async () => {
    // A handler on the element and another on a wrapper is the usual way a
    // click ends up counted twice.
    const user = userEvent.setup();
    setConsent('granted');
    render(
      <Button tracking={{ name: 'Once', location: 'hero', destination: '/platform' }}>Once</Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Once' }));

    expect(dataLayer()).toHaveLength(1);
  });

  it('still calls the onClick supplied by the caller, exactly once', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    setConsent('granted');
    render(
      <Button
        tracking={{ name: 'Retry', location: 'resource_library', destination: '/resources' }}
        onClick={onClick}
      >
        Retry
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('records nothing while consent is withheld', async () => {
    const user = userEvent.setup();
    setConsent('denied');
    render(
      <Button tracking={{ name: 'Explore', location: 'hero', destination: '/platform' }}>
        Explore
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Explore' }));

    expect(dataLayer()).toHaveLength(0);
  });

  it('records nothing before a choice has been made', async () => {
    // The default is denied, not "not yet decided means yes".
    const user = userEvent.setup();
    render(
      <Button tracking={{ name: 'Explore', location: 'hero', destination: '/platform' }}>
        Explore
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Explore' }));

    expect(dataLayer()).toHaveLength(0);
  });

  it('is measured by keyboard activation as well as by click', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(
      <Button tracking={{ name: 'Keyboard', location: 'footer', destination: '/about' }}>
        Keyboard
      </Button>,
    );

    await user.tab();
    await user.keyboard('{Enter}');

    expect(dataLayer()).toHaveLength(1);
  });

  it('takes the destination of a link from its href by default', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(
      <ButtonLink to="/about#contact" tracking={{ name: 'Contact us', location: 'header' }}>
        Contact us
      </ButtonLink>,
    );

    await user.click(screen.getByRole('link', { name: 'Contact us' }));

    expect(dataLayer()[0]).toEqual({
      event: 'cta_click',
      cta_name: 'Contact us',
      cta_location: 'header',
      destination: '/about#contact',
    });
  });

  it('records the click on an external link too', async () => {
    const user = userEvent.setup();
    setConsent('granted');
    render(
      <ButtonLink to="https://example.org/report" tracking={{ name: 'Report', location: 'footer' }}>
        Report
      </ButtonLink>,
    );

    await user.click(screen.getByRole('link', { name: /report/i }));

    expect(dataLayer()).toHaveLength(1);
    expect(dataLayer()[0]).toMatchObject({ destination: 'https://example.org/report' });
  });

  it('keeps the side effect of a link working', async () => {
    // The mobile menu closes itself through this prop; tracking must not
    // displace it.
    const user = userEvent.setup();
    const onClick = jest.fn();
    setConsent('granted');
    render(
      <ButtonLink to="/about" tracking={{ name: 'About', location: 'header' }} onClick={onClick}>
        About
      </ButtonLink>,
    );

    await user.click(screen.getByRole('link', { name: 'About' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(dataLayer()).toHaveLength(1);
  });
});
