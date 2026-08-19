import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { setConsent } from '@/lib/analytics/consent';
import { resetPendingEvents } from '@/lib/analytics/dataLayer';
import { ContactForm } from './ContactForm';

/**
 * The contact form.
 *
 * fetch is mocked at the network boundary, so the validation, the state machine
 * and the rendering all run for real and only the server is simulated.
 *
 * The accessibility assertions here are the substance of the component rather
 * than an afterthought: a form that validates correctly but leaves a screen
 * reader user with no idea which field is wrong has not validated anything
 * useful.
 */

const mockFetch = jest.fn();

const dataLayer = () => window.dataLayer ?? [];
const formSubmits = () =>
  dataLayer().filter((entry) => (entry as { event: string }).event === 'form_submit');

const accepts = () =>
  mockFetch.mockResolvedValue({
    ok: true,
    status: 202,
    json: async () => ({ status: 'received', message: 'Thanks' }),
  } as Response);

const rejectsWith = (fields: Record<string, string>) =>
  mockFetch.mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ code: 'validation_failed', message: 'Some fields', fields }),
  } as Response);

const fails = () => mockFetch.mockRejectedValue(new Error('offline'));

const VALID_MESSAGE = 'We are replacing three patient portals and would like to talk it through.';

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), 'Sara Okonkwo');
  await user.type(screen.getByLabelText(/email address/i), 'sara@example.org');
  await user.type(screen.getByLabelText(/how can we help/i), VALID_MESSAGE);
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /send message/i }));

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  window.localStorage.clear();
  window.dataLayer = [];
  resetPendingEvents();
});

describe('ContactForm', () => {
  describe('structure', () => {
    it('gives every field a real label that names its control', () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/your name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/organisation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/how can we help/i).tagName).toBe('TEXTAREA');
    });

    it('marks the optional field as optional rather than marking the rest as required', () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/organisation/i)).toHaveAccessibleName(
        expect.stringMatching(/optional/i),
      );
    });

    it('associates the message hint with the field', () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/how can we help/i)).toHaveAccessibleDescription(
        /leave out personal, clinical or confidential details/i,
      );
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<ContactForm />);

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('validation', () => {
    it('does not submit an empty form to the server', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows an error summary listing every problem', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      const summary = await screen.findByRole('heading', { name: /problems with your message/i });
      const list = summary.parentElement!.querySelector('ul')!;
      expect(within(list).getAllByRole('link')).toHaveLength(3);
    });

    it('moves focus to the summary so the failure is announced', async () => {
      // Leaving focus on the submit button tells a screen reader user nothing
      // about why the page has not moved on.
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent(/problems with your message/i);
      });
    });

    it('links each summary entry to the field it belongs to', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      const nameInput = screen.getByLabelText(/your name/i);
      const link = screen.getByRole('link', { name: /enter your name/i });
      expect(link).toHaveAttribute('href', `#${nameInput.id}`);
    });

    it('attaches each message to its own field with aria-describedby', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/email address/i), 'not-an-address');
      await submit(user);

      const email = await screen.findByLabelText(/email address/i);
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(email).toHaveAccessibleDescription(expect.stringMatching(/name@example\.com/));
    });

    it('keeps the hint associated with the message field when it also has an error', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      const message = screen.getByLabelText(/how can we help/i);
      expect(message).toHaveAccessibleDescription(expect.stringMatching(/enter a message/i));
      expect(message).toHaveAccessibleDescription(expect.stringMatching(/leave out personal/i));
    });

    it('states the error in words rather than relying on colour', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);

      // Someone who cannot distinguish the red gets the same information.
      expect(screen.getAllByText(/^Error:$/i).length).toBeGreaterThan(0);
    });

    it('clears a field message once the field is edited', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await submit(user);
      expect(screen.getByLabelText(/your name/i)).toHaveAttribute('aria-invalid', 'true');

      await user.type(screen.getByLabelText(/your name/i), 'Sara');

      // A message that contradicts what is now in the field is worse than none.
      expect(screen.getByLabelText(/your name/i)).not.toHaveAttribute('aria-invalid');
    });

    it('keeps what was typed when validation fails', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/your name/i), 'Sara Okonkwo');
      await submit(user);

      expect(screen.getByLabelText(/your name/i)).toHaveValue('Sara Okonkwo');
    });

    it('is operable by keyboard alone, from first field to submission', async () => {
      const user = userEvent.setup();
      accepts();
      render(<ContactForm />);

      await user.tab();
      expect(screen.getByLabelText(/your name/i)).toHaveFocus();
      await user.keyboard('Sara Okonkwo');

      await user.tab();
      await user.keyboard('sara@example.org');
      await user.tab();
      await user.tab();
      await user.keyboard(VALID_MESSAGE);
      await user.tab();

      expect(screen.getByRole('button', { name: /send message/i })).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(await screen.findByRole('status')).toHaveTextContent(/message received/i);
    });

    it('has no accessibility violations while showing errors', async () => {
      const user = userEvent.setup();
      const { container } = render(<ContactForm />);

      await submit(user);
      await screen.findByRole('heading', { name: /problems with your message/i });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('submission', () => {
    it('posts the trimmed submission as JSON', async () => {
      const user = userEvent.setup();
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(String(url)).toContain('/api/contact');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        name: 'Sara Okonkwo',
        email: 'sara@example.org',
        message: VALID_MESSAGE,
      });
    });

    it('confirms success in a live region and moves focus to it', async () => {
      const user = userEvent.setup();
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      const confirmation = await screen.findByRole('status');
      expect(confirmation).toHaveTextContent(/message received/i);
      await waitFor(() => expect(confirmation).toHaveFocus());
    });

    it('says plainly that nothing was delivered', async () => {
      // The site must not imply a reply is coming from a fictional company.
      const user = userEvent.setup();
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      expect(await screen.findByRole('status')).toHaveTextContent(/demonstration project/i);
    });

    it('shows the messages the server returned when it rejects a submission', async () => {
      // The browser accepted these; the server did not. Its messages win.
      const user = userEvent.setup();
      rejectsWith({ email: 'That address cannot receive mail.' });
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      // Once in the summary, once beside the field it belongs to.
      expect(await screen.findAllByText(/cannot receive mail/i)).toHaveLength(2);
      await waitFor(() =>
        expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true'),
      );
    });

    it('reports a failed request as an alert and keeps the message', async () => {
      const user = userEvent.setup();
      fails();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/could not be sent/i);
      expect(screen.getByLabelText(/how can we help/i)).toHaveValue(VALID_MESSAGE);
    });

    it('marks the submit button busy without taking focus away from it', async () => {
      // A disabled button drops out of the accessibility tree, and the browser
      // then moves focus to <body>: the keyboard user who just pressed it loses
      // their place and hears nothing. aria-disabled keeps it focusable, and
      // the handler refuses the second submission instead.
      const user = userEvent.setup();
      mockFetch.mockReturnValue(new Promise(() => {}));
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      const button = await screen.findByRole('button', { name: /sending/i });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      expect(button).toHaveFocus();

      await user.click(button);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('announces that the message is being sent', async () => {
      const user = userEvent.setup();
      mockFetch.mockReturnValue(new Promise(() => {}));
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);

      // The label of the focused button changes, which is not reliably
      // re-announced on its own.
      expect(await screen.findByRole('status')).toHaveTextContent(/sending your message/i);
    });
  });

  describe('analytics', () => {
    it('records form_submit once, after a successful submission', async () => {
      const user = userEvent.setup();
      setConsent('granted');
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);
      await screen.findByRole('status');

      expect(formSubmits()).toHaveLength(1);
      expect(formSubmits()[0]).toEqual({
        event: 'form_submit',
        form_name: 'contact',
        form_status: 'success',
      });
    });

    it('sends no personal data with the event', async () => {
      // The name, the address and the message are exactly what must not reach
      // an analytics payload.
      const user = userEvent.setup();
      setConsent('granted');
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);
      await screen.findByRole('status');

      const payload = JSON.stringify(formSubmits()[0]);
      expect(payload).not.toContain('sara@example.org');
      expect(payload).not.toContain('Sara Okonkwo');
      expect(payload).not.toContain(VALID_MESSAGE);
    });

    it('records nothing when validation fails in the browser', async () => {
      const user = userEvent.setup();
      setConsent('granted');
      render(<ContactForm />);

      await submit(user);
      await screen.findByRole('heading', { name: /problems with your message/i });

      expect(dataLayer()).toHaveLength(0);
    });

    it('records nothing when the server rejects the submission', async () => {
      const user = userEvent.setup();
      setConsent('granted');
      rejectsWith({ email: 'That address cannot receive mail.' });
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);
      await screen.findAllByText(/cannot receive mail/i);

      expect(formSubmits()).toHaveLength(0);
    });

    it('records nothing when the request fails', async () => {
      const user = userEvent.setup();
      setConsent('granted');
      fails();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);
      await screen.findByRole('alert');

      expect(formSubmits()).toHaveLength(0);
    });

    it('records nothing when consent has been withheld', async () => {
      const user = userEvent.setup();
      setConsent('denied');
      accepts();
      render(<ContactForm />);

      await fillIn(user);
      await submit(user);
      await screen.findByRole('status');

      expect(dataLayer()).toHaveLength(0);
    });
  });
});

describe('ContactForm accessibility regressions', () => {
  it('marks the required fields required, and the optional one not', async () => {
    // The visible copy says which fields are needed; `required` is what carries
    // the same fact to a screen reader, which announces "required" with the
    // field rather than leaving the user to submit and find out.
    render(<ContactForm />);

    expect(screen.getByLabelText(/your name/i)).toBeRequired();
    expect(screen.getByLabelText(/email address/i)).toBeRequired();
    expect(screen.getByLabelText(/how can we help/i)).toBeRequired();
    expect(screen.getByLabelText(/organisation/i)).not.toBeRequired();
  });

  it('still validates in JavaScript rather than through browser bubbles', async () => {
    // required + noValidate: the attribute informs assistive technology, and
    // the form keeps ownership of the messages, which the browser's own
    // popups cannot provide accessibly.
    const user = userEvent.setup();
    render(<ContactForm />);

    expect(screen.getByRole('button', { name: /send message/i }).closest('form')).toHaveAttribute(
      'novalidate',
    );

    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(
      await screen.findByRole('heading', { name: /problems with your message/i }),
    ).toBeVisible();
  });

  it('lets a keyboard user recover from an error through the summary link', async () => {
    // The summary is only useful if its links actually reach the field. In a
    // browser the fragment moves focus; here the association is asserted
    // instead, since jsdom implements no fragment navigation.
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole('button', { name: /send message/i }));
    const link = await screen.findByRole('link', { name: /enter your email address/i });

    const target = document.getElementById(link.getAttribute('href')!.slice(1));
    expect(target).toBe(screen.getByLabelText(/email address/i));
    expect(target).toHaveAttribute('aria-invalid', 'true');
  });

  it('has no accessibility violations in the success state', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ status: 'received', message: 'Thanks' }),
    } as Response);
    const { container } = render(<ContactForm />);

    await user.type(screen.getByLabelText(/your name/i), 'Sara Okonkwo');
    await user.type(screen.getByLabelText(/email address/i), 'sara@example.org');
    await user.type(
      screen.getByLabelText(/how can we help/i),
      'We are replacing three patient portals and would like to talk it through.',
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await screen.findByText(/message received/i);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations while the submission is failing', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValue(new Error('offline'));
    const { container } = render(<ContactForm />);

    await user.type(screen.getByLabelText(/your name/i), 'Sara Okonkwo');
    await user.type(screen.getByLabelText(/email address/i), 'sara@example.org');
    await user.type(
      screen.getByLabelText(/how can we help/i),
      'We are replacing three patient portals and would like to talk it through.',
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await screen.findByRole('alert');

    expect(await axe(container)).toHaveNoViolations();
  });
});
