import type { ContactFieldErrors, ContactSubmission, ContactValues } from '../../types/contact';
import { CONTACT_LIMITS } from '../../types/contact';

/**
 * Validation for the contact form.
 *
 * One module, run twice: the form calls it on submit so a reader is not made to
 * wait for a round trip to learn that an email address is missing, and
 * src/api/contact.ts calls it again on the server because client-side
 * validation is a convenience and never a control. A request can be sent with
 * curl, and the browser copy can be edited at runtime.
 *
 * Imports are relative rather than using the `@/` alias: Gatsby compiles
 * functions through a separate pipeline from the site bundle, and the alias
 * configured in gatsby-node.ts is not guaranteed to apply there.
 */

/**
 * Deliberately permissive.
 *
 * Address syntax is far more elaborate than any regular expression that fits on
 * a line, and a strict pattern rejects valid addresses — which is a worse
 * failure than accepting an invalid one, because the sender is simply locked
 * out. This catches the mistakes people actually make: no @, no domain, no dot,
 * or whitespace in the middle.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ContactValidation =
  { ok: true; value: ContactSubmission } | { ok: false; errors: ContactFieldErrors };

/** Reads a field from an unknown body, tolerating absence and wrong types. */
function readField(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates a submission from either side of the network.
 *
 * Takes `unknown` because on the server the body is whatever was posted. Every
 * invalid field is reported at once: returning only the first would make a
 * reader fix four mistakes in four round trips.
 */
export function validateContact(input: unknown): ContactValidation {
  const source: Record<string, unknown> =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const values: ContactValues = {
    name: readField(source, 'name'),
    email: readField(source, 'email'),
    organisation: readField(source, 'organisation'),
    message: readField(source, 'message'),
  };

  const errors: ContactFieldErrors = {};

  if (values.name === '') {
    errors.name = 'Enter your name.';
  } else if (values.name.length > CONTACT_LIMITS.name.max) {
    errors.name = `Your name must be ${CONTACT_LIMITS.name.max} characters or fewer.`;
  }

  if (values.email === '') {
    errors.email = 'Enter your email address.';
  } else if (values.email.length > CONTACT_LIMITS.email.max) {
    errors.email = `Your email address must be ${CONTACT_LIMITS.email.max} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter an email address in the format name@example.com.';
  }

  if (values.organisation.length > CONTACT_LIMITS.organisation.max) {
    errors.organisation = `Your organisation must be ${CONTACT_LIMITS.organisation.max} characters or fewer.`;
  }

  if (values.message === '') {
    errors.message = 'Enter a message.';
  } else if (values.message.length < CONTACT_LIMITS.message.min) {
    errors.message = `Your message must be at least ${CONTACT_LIMITS.message.min} characters.`;
  } else if (values.message.length > CONTACT_LIMITS.message.max) {
    errors.message = `Your message must be ${CONTACT_LIMITS.message.max} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: values.name,
      email: values.email,
      message: values.message,
      // Omitted rather than sent as an empty string, so an absent optional
      // field is absent in the payload too.
      ...(values.organisation !== '' ? { organisation: values.organisation } : {}),
    },
  };
}

/**
 * Field names in the order they appear in the form.
 *
 * The error summary lists problems in that order, so the list matches the
 * reading and tab order of the fields it links to.
 */
export function orderedErrorFields(errors: ContactFieldErrors): string[] {
  return (['name', 'email', 'organisation', 'message'] as const).filter(
    (field) => errors[field] !== undefined,
  );
}
