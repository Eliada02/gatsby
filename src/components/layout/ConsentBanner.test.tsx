import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { readConsent, setConsent } from '@/lib/analytics/consent';
import { resetPendingEvents } from '@/lib/analytics/dataLayer';
import { trackPageView } from '@/lib/analytics/track';
import { ConsentBanner } from './ConsentBanner';

beforeEach(() => {
  window.localStorage.clear();
  window.dataLayer = [];
  resetPendingEvents();
});

describe('ConsentBanner', () => {
  it('asks when no choice has been recorded', async () => {
    render(<ConsentBanner />);

    expect(await screen.findByRole('region', { name: /analytics consent/i })).toBeInTheDocument();
  });

  it('stays hidden once a choice exists', async () => {
    setConsent('denied');
    render(<ConsentBanner />);

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /analytics consent/i })).not.toBeInTheDocument();
    });
  });

  it('offers decline and accept with equal prominence', async () => {
    // Both are real buttons of the same size. Demoting refusal is the standard
    // failure of consent notices.
    render(<ConsentBanner />);

    const decline = await screen.findByRole('button', { name: /decline/i });
    const accept = screen.getByRole('button', { name: /accept analytics/i });

    expect(decline).toBeVisible();
    expect(accept).toBeVisible();
    // Decline comes first in the tab order.
    expect(decline.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('records a decline and stops asking', async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);

    await user.click(await screen.findByRole('button', { name: /decline/i }));

    expect(readConsent()).toBe('denied');
    expect(screen.queryByRole('region', { name: /analytics consent/i })).not.toBeInTheDocument();
  });

  it('records consent and releases events captured beforehand', async () => {
    // The page view that happened while the banner was showing should still be
    // counted once the visitor agrees.
    const user = userEvent.setup();
    trackPageView({ path: '/', title: 'Home' });
    expect(window.dataLayer).toHaveLength(0);

    render(<ConsentBanner />);
    await user.click(await screen.findByRole('button', { name: /accept analytics/i }));

    expect(readConsent()).toBe('granted');
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toMatchObject({ event: 'page_view' });
  });

  it('is operable by keyboard alone', async () => {
    const user = userEvent.setup();
    render(<ConsentBanner />);
    await screen.findByRole('button', { name: /decline/i });

    await user.tab();
    expect(screen.getByRole('button', { name: /decline/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /accept analytics/i })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(readConsent()).toBe('granted');
  });

  it('states that the site is a demonstration and collects no health data', async () => {
    render(<ConsentBanner />);
    const region = await screen.findByRole('region', { name: /analytics consent/i });

    expect(region).toHaveTextContent(/no health information/i);
    expect(region).toHaveTextContent(/fictional demonstration/i);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConsentBanner />);
    await screen.findByRole('region', { name: /analytics consent/i });

    expect(await axe(container)).toHaveNoViolations();
  });
});
