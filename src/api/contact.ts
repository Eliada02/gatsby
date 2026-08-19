import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby';
import { validateContact } from '../lib/contact/validation';
import type { ContactErrorBody, ContactSuccessBody } from '../types/api';

/**
 * POST /api/contact
 *
 * The server-side boundary for contact submissions. It validates the request
 * and answers; it does not deliver anything. No email provider is configured in
 * this project, and adding one would mean a dependency, an API key and a
 * deliverability story for a demonstration site. The seam is here: a transport
 * slots in below the validation without changing the contract above it.
 *
 * The rules are the same module the form runs, so a request made with curl is
 * held to exactly the standard the browser is. Client-side validation is a
 * convenience for the person filling in the form and is never a control.
 *
 * Nothing submitted is logged. A contact message carries a name, an email
 * address and free text, and the default fate of that data on a demonstration
 * endpoint should be to be read once and forgotten. If delivery is added, the
 * logging decision has to be made deliberately at that point.
 *
 * Imports are relative rather than using the `@/` alias, for the reason given
 * in src/api/resources.ts: functions compile through a separate pipeline.
 */

type ContactResponse = GatsbyFunctionResponse<ContactSuccessBody | ContactErrorBody>;

const MAX_BODY_BYTES = 16_000;

/**
 * Reads the posted body.
 *
 * Gatsby parses JSON for you when the content type says so, but a request can
 * arrive as a string — from a proxy, a test, or a client that sent text/plain —
 * so the string case is handled rather than assumed away.
 */
function parseBody(body: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) return { ok: false };
    if (body.trim() === '') return { ok: true, value: {} };
    try {
      return { ok: true, value: JSON.parse(body) };
    } catch {
      return { ok: false };
    }
  }

  if (typeof body === 'object' && body !== null) return { ok: true, value: body };

  // undefined, a number, a boolean: nothing a submission could be.
  return { ok: false };
}

export default function handler(req: GatsbyFunctionRequest, res: ContactResponse): void {
  // Answers are never cacheable: a submission result is specific to one request.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    // Allow advertises the supported method, as 405 requires.
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      code: 'method_not_allowed',
      message: 'Send contact submissions with POST.',
    });
    return;
  }

  const parsed = parseBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({
      code: 'invalid_body',
      message: 'Send a JSON object containing the contact fields.',
    });
    return;
  }

  const result = validateContact(parsed.value);
  if (!result.ok) {
    // 422 would also be defensible. 400 is used because the resources endpoint
    // already answers malformed input with 400, and one convention across the
    // API is worth more than the distinction.
    res.status(400).json({
      code: 'validation_failed',
      message: 'Some fields need attention before this can be sent.',
      fields: result.errors,
    });
    return;
  }

  /*
   * Accepted rather than OK: the submission has been validated and taken, and
   * nothing further has happened to it. 200 would imply a completed action.
   */
  res.status(202).json({
    status: 'received',
    message: 'Thanks — your message has been received.',
  });
}
