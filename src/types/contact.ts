/**
 * Contact form contract.
 *
 * Shared by the form, the typed client and the Gatsby Function, so the fields a
 * form renders, the body a client sends and the payload a handler validates are
 * one definition. The validation rules themselves live in
 * src/lib/contact/validation.ts, which both sides run.
 */

export const CONTACT_FIELDS = ['name', 'email', 'organisation', 'message'] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

/** A submission after trimming. `organisation` is the only optional field. */
export interface ContactSubmission {
  name: string;
  email: string;
  organisation?: string;
  message: string;
}

/** Values as the form holds them: every field a string, including the optional one. */
export type ContactValues = Record<ContactField, string>;

/**
 * One message per invalid field, keyed by field name.
 *
 * Messages are written for a person and are identical on both sides of the
 * network, so a rejection from the server reads the same as one caught in the
 * browser rather than appearing to be a different kind of failure.
 */
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

/**
 * Length bounds, in characters.
 *
 * A maximum is a safety limit rather than an editorial one: unbounded free text
 * is a denial-of-service surface and a storage problem. The email maximum is
 * the 254 characters permitted by RFC 5321.
 */
export const CONTACT_LIMITS = {
  name: { max: 100 },
  email: { max: 254 },
  organisation: { max: 120 },
  message: { min: 10, max: 2000 },
} as const;
