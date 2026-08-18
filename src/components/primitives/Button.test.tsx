import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Button, ButtonLink } from './Button';

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
