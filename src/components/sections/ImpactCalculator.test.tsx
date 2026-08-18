import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { homeContent } from '@/lib/content/source';
import { CLINICIAN_RANGE, calculateImpact, formatNumber } from '@/lib/impact';
import { ImpactCalculator } from './ImpactCalculator';

/**
 * A note on how the slider is driven here.
 *
 * jsdom does not implement keyboard stepping for <input type="range">: arrow
 * keys, Home and End leave the value untouched. That behaviour is supplied by
 * the browser, which is precisely the argument for using the native element
 * instead of rebuilding a slider from divs.
 *
 * These tests therefore verify what jsdom can verify — that the control is
 * labelled, described, focusable and that a value change recalculates
 * everything — by dispatching the change event a browser would emit. Actual key
 * stepping is browser behaviour and is checked manually.
 */

const renderCalculator = () => render(<ImpactCalculator content={homeContent.impact} />);

const getSlider = () => screen.getByRole('slider', { name: /clinicians in the team/i });

const setSlider = (value: number) => {
  fireEvent.change(getSlider(), { target: { value: String(value) } });
};

describe('ImpactCalculator', () => {
  it('labels the range input so it has an accessible name', () => {
    // A slider without a programmatic label is announced only as "slider",
    // leaving a screen reader user with no idea what they are adjusting.
    renderCalculator();

    expect(getSlider()).toBeInTheDocument();
  });

  it('exposes the range bounds to assistive technology', () => {
    renderCalculator();
    const slider = getSlider();

    expect(slider).toHaveAttribute('min', String(CLINICIAN_RANGE.min));
    expect(slider).toHaveAttribute('max', String(CLINICIAN_RANGE.max));
    expect(slider).toHaveValue(String(CLINICIAN_RANGE.initial));
  });

  it('announces the value with its unit rather than a bare number', () => {
    renderCalculator();

    expect(getSlider()).toHaveAttribute('aria-valuetext', `${CLINICIAN_RANGE.initial} clinicians`);
  });

  it('describes the slider with the model assumptions', () => {
    // The assumptions are what make the output interpretable, so they must be
    // reachable from the control rather than only visible beside it.
    renderCalculator();

    expect(getSlider()).toHaveAccessibleDescription(/model assumptions/i);
  });

  it('is reachable by keyboard', async () => {
    const user = userEvent.setup();
    renderCalculator();

    await user.tab();

    expect(getSlider()).toHaveFocus();
  });

  it('shows figures derived from the model at the initial value', () => {
    renderCalculator();
    const expected = calculateImpact(CLINICIAN_RANGE.initial);

    expect(screen.getByText(formatNumber(expected.hoursPerWeek))).toBeInTheDocument();
    expect(screen.getByText(formatNumber(expected.appointmentsPerYear))).toBeInTheDocument();
  });

  it('recalculates every figure when the value changes', () => {
    renderCalculator();

    setSlider(80);

    const expected = calculateImpact(80);
    expect(screen.getByText(formatNumber(expected.hoursPerWeek))).toBeInTheDocument();
    expect(screen.getByText(formatNumber(expected.hoursPerYear))).toBeInTheDocument();
    expect(screen.getByText(formatNumber(expected.appointmentsPerYear))).toBeInTheDocument();
  });

  it('keeps the spoken value in step with the displayed value', () => {
    renderCalculator();

    setSlider(60);

    expect(getSlider()).toHaveAttribute('aria-valuetext', '60 clinicians');
  });

  it('announces the result only after the value settles', async () => {
    renderCalculator();
    const status = screen.getByRole('status');
    const initialAnnouncement = status.textContent;

    // Three changes in quick succession, as a drag would produce.
    setSlider(40);
    setSlider(60);
    setSlider(80);

    // The live region still holds the old value, so a screen reader is not
    // interrupted once per step of the drag.
    expect(status.textContent).toBe(initialAnnouncement);

    const expected = calculateImpact(80);
    await waitFor(() => {
      expect(status).toHaveTextContent(`${expected.clinicians} clinicians`);
    });
    expect(status).toHaveTextContent(formatNumber(expected.appointmentsPerYear));
  });

  it('has exactly one live region, so a change is announced once', () => {
    // <output> carries an implicit role="status". Using one for the visible
    // counter created a second live region that announced on every step and
    // defeated the debounce above.
    renderCalculator();

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('states that the model is illustrative', () => {
    renderCalculator();

    expect(screen.getByText(/illustrative rates/i)).toBeInTheDocument();
  });

  it('offers a link, not a button, for the call to action', () => {
    // It navigates, so it must be an anchor: middle-click and open-in-new-tab
    // are broken by a button, and screen readers announce the wrong role.
    renderCalculator();
    const region = screen.getByRole('region', { name: /see how the model scales/i });

    expect(within(region).getByRole('link', { name: /talk to us about your team/i })).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCalculator();

    expect(await axe(container)).toHaveNoViolations();
  });
});
