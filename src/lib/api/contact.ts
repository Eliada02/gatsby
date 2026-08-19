import type { ContactErrorBody, ContactSuccessBody } from '@/types/api';
import type { ContactFieldErrors, ContactSubmission } from '@/types/contact';

/**
 * Typed access to the contact endpoint.
 *
 * Not routed through requestJson: that helper turns a non-2xx response into an
 * ApiError carrying only a message, and this endpoint's 400 body is the useful
 * part — one message per invalid field. Throwing it away and showing "the
 * request failed" would be a worse form than no server validation at all.
 *
 * The result is a union rather than an exception, because a rejected submission
 * is an ordinary outcome the form has to render, not an error condition.
 */

const ENDPOINT = '/api/contact';
const TIMEOUT_MS = 10_000;

const BASE_URL = process.env.GATSBY_API_BASE_URL ?? '';

export type ContactSubmitResult =
  { status: 'sent' } | { status: 'invalid'; errors: ContactFieldErrors } | { status: 'failed' };

/** Narrows an unknown body to the endpoint's error shape without trusting it. */
function readFieldErrors(body: unknown): ContactFieldErrors | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const fields = (body as ContactErrorBody).fields;
  if (typeof fields !== 'object' || fields === null) return undefined;
  return fields;
}

export async function submitContact(submission: ContactSubmission): Promise<ContactSubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(submission),
      signal: controller.signal,
    });

    if (response.ok) {
      // The body is read so a truncated or non-JSON response is treated as a
      // failure rather than reported to the sender as a delivered message.
      const body = (await response.json()) as ContactSuccessBody;
      return body?.status === 'received' ? { status: 'sent' } : { status: 'failed' };
    }

    if (response.status === 400) {
      const body: unknown = await response.json().catch(() => undefined);
      const errors = readFieldErrors(body);
      if (errors && Object.keys(errors).length > 0) return { status: 'invalid', errors };
    }

    return { status: 'failed' };
  } catch {
    // Offline, timed out, or an unparseable response. The form says so and
    // keeps what was typed; nothing here is worth distinguishing to a sender.
    return { status: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
