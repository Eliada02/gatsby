import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { PRIMARY_NAV } from '@/lib/navigation';
import { Header } from './Header';

/**
 * These tests describe how the header behaves for a keyboard user, which is the
 * part the design reference omits entirely: its navigation is `hidden md:flex`
 * with no toggle, so below 768px there is no way to navigate the site at all.
 */

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.getByRole('button', { name: 'Open main menu' });
  await user.click(toggle);
  return toggle;
};

describe('Header', () => {
  it('exposes every primary destination as a link', () => {
    render(<Header />);

    // The desktop bar and the mobile panel both render PRIMARY_NAV, so each
    // label appears twice in jsdom, where CSS media queries do not apply.
    for (const item of PRIMARY_NAV) {
      const links = screen.getAllByRole('link', { name: item.label });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', item.to);
    }
  });

  it('links the wordmark home', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: /novahealth/i })).toHaveAttribute('href', '/');
  });

  describe('mobile menu', () => {
    it('starts collapsed and reports that state', () => {
      render(<Header />);

      const toggle = screen.getByRole('button', { name: 'Open main menu' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('points aria-controls at an element that exists while collapsed', () => {
      // The panel stays in the DOM and is hidden with the hidden attribute. If
      // it were unmounted, aria-controls would reference a missing id, which
      // assistive technology cannot resolve.
      render(<Header />);

      const toggle = screen.getByRole('button', { name: 'Open main menu' });
      const panelId = toggle.getAttribute('aria-controls');

      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId!)).toBeInTheDocument();
    });

    it('opens, updates its label, and moves focus into the panel', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const toggle = await openMenu(user);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Close main menu' })).toBe(toggle);

      const panel = document.getElementById(toggle.getAttribute('aria-controls')!);
      expect(panel).toBeVisible();
      // Focus must land inside the panel, not stay behind on the toggle.
      expect(panel).toContainElement(document.activeElement as HTMLElement);
    });

    it('traps Tab within the panel while open', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const toggle = await openMenu(user);
      const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
      const focusable = within(panel).getAllByRole('link');

      // Walk to the last item, then one more Tab must wrap to the first rather
      // than escaping to content behind the overlay.
      for (let i = 0; i < focusable.length; i += 1) {
        await user.tab();
      }
      expect(panel).toContainElement(document.activeElement as HTMLElement);

      await user.tab();
      expect(panel).toContainElement(document.activeElement as HTMLElement);
    });

    it('wraps backwards with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const toggle = await openMenu(user);
      const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;

      await user.tab({ shift: true });

      expect(panel).toContainElement(document.activeElement as HTMLElement);
    });

    it('closes on Escape and returns focus to the toggle', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const toggle = await openMenu(user);
      await user.keyboard('{Escape}');

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      // Returning focus is what stops the user being dropped back at the top of
      // the document having lost their place.
      expect(toggle).toHaveFocus();
    });

    it('closes when a destination is chosen, and hands focus back', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const toggle = await openMenu(user);
      const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;

      await user.click(within(panel).getByRole('link', { name: 'Resources' }));

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      // Focus cannot be left inside a panel that is now display:none, or the
      // next Tab starts from the top of the document.
      expect(toggle).toHaveFocus();
    });

    it('keeps the closed panel out of the tab order entirely', () => {
      // hidden removes it from the accessibility tree; the stylesheet re-asserts
      // display:none because the panel's own display:flex would otherwise win
      // on source order and leave focusable links in a panel nobody can see.
      render(<Header />);

      const toggle = screen.getByRole('button', { name: 'Open main menu' });
      const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;

      expect(panel).toHaveAttribute('hidden');
      expect(panel).not.toBeVisible();
    });

    it('locks background scrolling only while open', async () => {
      const user = userEvent.setup();
      render(<Header />);

      expect(document.body.style.overflow).not.toBe('hidden');

      await openMenu(user);
      expect(document.body.style.overflow).toBe('hidden');

      await user.keyboard('{Escape}');
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(<Header />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations when the menu is open', async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);

    await openMenu(user);

    expect(await axe(container)).toHaveNoViolations();
  });
});
