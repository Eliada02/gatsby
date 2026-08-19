import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/primitives/Button';
import { trackFormSubmit } from '@/lib/analytics/track';
import { submitContact } from '@/lib/api/contact';
import { orderedErrorFields, validateContact } from '@/lib/contact/validation';
import type { ContactField, ContactFieldErrors, ContactValues } from '@/types/contact';
import * as styles from './ContactForm.module.css';

/**
 * The contact form.
 *
 * Plain React state and one validation module. No form library: this is four
 * fields, and the accessibility requirements — associated labels, messages tied
 * to their inputs, an error summary, managed focus — are things a library would
 * have to be configured to do correctly anyway.
 *
 * Validation runs in two places on purpose. Here, so a reader is not made to
 * wait for a round trip to be told an address is missing, and again in
 * src/api/contact.ts, because nothing arriving over HTTP can be trusted. Both
 * run the same module, so the two can never disagree.
 *
 * No error is carried by colour alone: each one is a sentence beginning with
 * the word "Error", marked with an icon, attached to its input through
 * aria-describedby and flagged with aria-invalid.
 */

const FORM_NAME = 'contact';

const EMPTY_VALUES: ContactValues = { name: '', email: '', organisation: '', message: '' };

type FormStatus = 'editing' | 'submitting' | 'invalid' | 'failed' | 'sent';

export function ContactForm() {
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<FormStatus>('editing');

  /*
   * useId rather than fixed ids: the label/input association has to stay
   * correct if this form is ever rendered twice on a page, where hard-coded ids
   * would silently point both labels at the first input.
   */
  const baseId = useId();
  const fieldId = (field: ContactField) => `${baseId}-${field}`;
  const errorId = (field: ContactField) => `${baseId}-${field}-error`;
  const messageHintId = `${baseId}-message-hint`;

  const summaryRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  /*
   * Focus follows the outcome. A reader who submits and is left where they were
   * has no way of knowing whether anything happened: the message they need is
   * often above the viewport, and nothing will have been announced.
   */
  useEffect(() => {
    if (status === 'invalid') summaryRef.current?.focus();
    if (status === 'failed') failureRef.current?.focus();
    if (status === 'sent') confirmationRef.current?.focus();
  }, [status]);

  const invalidFields = orderedErrorFields(errors) as ContactField[];

  const update = (field: ContactField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));

    // A message that has been acted on stops being shown, rather than
    // contradicting what is now in the field.
    setErrors((current) => {
      if (current[field] === undefined) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const result = validateContact(values);

    if (!result.ok) {
      setErrors(result.errors);
      setStatus('invalid');
      /*
       * Deliberately not measured. A submission that never left the browser is
       * not a form submission, and counting it would inflate the one number
       * this form contributes to a report.
       */
      return;
    }

    setErrors({});
    setStatus('submitting');

    const outcome = await submitContact(result.value);

    if (outcome.status === 'sent') {
      setValues(EMPTY_VALUES);
      setStatus('sent');
      // Names, addresses and message text stay out of this: the event records
      // that a contact form succeeded, and nothing about who sent it.
      trackFormSubmit(FORM_NAME, 'success');
      return;
    }

    if (outcome.status === 'invalid') {
      // The server rejected fields the browser accepted. Its messages win.
      setErrors(outcome.errors);
      setStatus('invalid');
      return;
    }

    setStatus('failed');
  };

  if (status === 'sent') {
    return (
      <div
        className={styles.confirmation}
        role="status"
        ref={confirmationRef}
        tabIndex={-1}
        // Read as one statement rather than as the fragment that changed.
        aria-atomic="true"
      >
        <h3 className={styles.confirmationHeading}>
          <span aria-hidden="true" className={styles.confirmationMark}>
            &#10003;
          </span>{' '}
          Message received
        </h3>
        <p className={styles.confirmationBody}>
          Thank you. Your message was validated and received. NovaHealth is a demonstration project,
          so nothing was sent to a real mailbox and no one will reply.
        </p>
        <Button variant="secondary" onClick={() => setStatus('editing')}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    /*
     * noValidate turns off the browser's own bubbles. They cannot be styled,
     * they vanish on the next interaction and they are announced
     * inconsistently, so validation is owned here where the messages can be
     * persistent, attached to their fields and listed in the summary.
     */
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {status === 'invalid' && invalidFields.length > 0 && (
        <div className={styles.summary} ref={summaryRef} tabIndex={-1}>
          <h3 className={styles.summaryHeading}>
            There {invalidFields.length === 1 ? 'is a problem' : 'are problems'} with your message
          </h3>
          {/* Links in field order: activating one moves focus to that input. */}
          <ul className={styles.summaryList}>
            {invalidFields.map((field) => (
              <li key={field}>
                <a href={`#${fieldId(field)}`}>{errors[field]}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'failed' && (
        <div className={styles.failure} role="alert" ref={failureRef} tabIndex={-1}>
          <p>
            <strong>Error:</strong> your message could not be sent just now. Check your connection
            and try again — nothing you typed has been lost.
          </p>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fieldId('name')}>
          Your name
        </label>
        {errors.name && <FieldError id={errorId('name')} message={errors.name} />}
        <input
          id={fieldId('name')}
          className={styles.input}
          type="text"
          name="name"
          required
          value={values.name}
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? errorId('name') : undefined}
          onChange={(event) => update('name', event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fieldId('email')}>
          Email address
        </label>
        {errors.email && <FieldError id={errorId('email')} message={errors.email} />}
        <input
          id={fieldId('email')}
          className={styles.input}
          /*
           * type="email" for the mobile keyboard and autofill. The constraint it
           * implies is not relied on: noValidate is set, and the address is
           * checked by the same module the server runs.
           */
          type="email"
          name="email"
          required
          value={values.email}
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? errorId('email') : undefined}
          onChange={(event) => update('email', event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fieldId('organisation')}>
          Organisation <span className={styles.optional}>(optional)</span>
        </label>
        {errors.organisation && (
          <FieldError id={errorId('organisation')} message={errors.organisation} />
        )}
        <input
          id={fieldId('organisation')}
          className={styles.input}
          type="text"
          name="organisation"
          value={values.organisation}
          autoComplete="organization"
          aria-invalid={errors.organisation ? true : undefined}
          aria-describedby={errors.organisation ? errorId('organisation') : undefined}
          onChange={(event) => update('organisation', event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={fieldId('message')}>
          How can we help?
        </label>
        <p id={messageHintId} className={styles.hint}>
          Please leave out personal, clinical or confidential details.
        </p>
        {errors.message && <FieldError id={errorId('message')} message={errors.message} />}
        <textarea
          id={fieldId('message')}
          className={styles.textarea}
          name="message"
          required
          rows={6}
          value={values.message}
          aria-invalid={errors.message ? true : undefined}
          // The hint stays associated when an error is present, so the
          // instruction is not lost at the moment it matters most.
          aria-describedby={
            errors.message ? `${errorId('message')} ${messageHintId}` : messageHintId
          }
          onChange={(event) => update('message', event.target.value)}
        />
      </div>

      <div className={styles.actions}>
        {/*
         * aria-disabled rather than disabled. Disabling the button a keyboard
         * user has just activated removes it from the accessibility tree while
         * it holds focus, and the browser drops focus to <body> — the reader
         * loses their place and hears nothing further. The button therefore
         * stays focusable and the duplicate submission is refused in the
         * handler instead.
         */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          aria-disabled={status === 'submitting' ? true : undefined}
        >
          {status === 'submitting' ? 'Sending…' : 'Send message'}
        </Button>
      </div>

      {/*
       * Present at all times with empty content, because a live region that is
       * inserted together with its text is announced unreliably. The label of
       * the focused button also changes to "Sending…", which is not reliably
       * re-announced on its own.
       */}
      <p className="nh-visually-hidden" role="status">
        {status === 'submitting' ? 'Sending your message' : ''}
      </p>
    </form>
  );
}

/**
 * A field-level message.
 *
 * Rendered before the input rather than after it: at high magnification the
 * message is then in the same view as the field it applies to, instead of
 * sitting below the bottom of the screen.
 *
 * The word "Error" and the icon carry the meaning; colour only reinforces it,
 * so the state survives a monochrome display and colour blindness.
 */
function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className={styles.error}>
      <span aria-hidden="true" className={styles.errorIcon}>
        !
      </span>
      <span>
        <strong>Error:</strong> {message}
      </span>
    </p>
  );
}
