import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby';
import handler from './contact';

/**
 * POST /api/contact.
 *
 * The handler is a plain function of a request and a response, so it is tested
 * as one: no server is started and no port is bound. The doubles below record
 * exactly what a Gatsby Function is given and what it is expected to call.
 *
 * These assertions exist because the endpoint is the only validation that
 * cannot be bypassed. Everything the form checks can be edited away in a
 * browser or skipped entirely with curl.
 */

interface RecordedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function createResponse() {
  const recorded: RecordedResponse = { status: 0, body: undefined, headers: {} };

  const res = {
    status(code: number) {
      recorded.status = code;
      return res;
    },
    json(body: unknown) {
      recorded.body = body;
      return res;
    },
    setHeader(name: string, value: string) {
      recorded.headers[name] = value;
      return res;
    },
  };

  return { res: res as unknown as GatsbyFunctionResponse, recorded };
}

function request(overrides: Partial<GatsbyFunctionRequest> = {}): GatsbyFunctionRequest {
  return {
    method: 'POST',
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as GatsbyFunctionRequest;
}

const validBody = {
  name: 'Sara Okonkwo',
  email: 'sara@example.org',
  message: 'We are replacing three patient portals and would like to talk about the migration.',
};

describe('POST /api/contact', () => {
  describe('request method', () => {
    it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('rejects %s with 405', (method) => {
      const { res, recorded } = createResponse();

      handler(request({ method, body: validBody }), res);

      expect(recorded.status).toBe(405);
      expect(recorded.body).toMatchObject({ code: 'method_not_allowed' });
      // 405 requires the server to say what it does accept.
      expect(recorded.headers.Allow).toBe('POST');
    });
  });

  describe('request body', () => {
    it('accepts a JSON string body, as a proxy or a non-JSON client may send', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: JSON.stringify(validBody) }), res);

      expect(recorded.status).toBe(202);
    });

    it('rejects a body that is not JSON', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: '{not json' }), res);

      expect(recorded.status).toBe(400);
      expect(recorded.body).toMatchObject({ code: 'invalid_body' });
    });

    it('rejects a body that is not an object', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: undefined }), res);

      expect(recorded.status).toBe(400);
      expect(recorded.body).toMatchObject({ code: 'invalid_body' });
    });

    it('rejects a body larger than the limit without parsing it', () => {
      const { res, recorded } = createResponse();

      handler(
        request({ body: JSON.stringify({ ...validBody, message: 'a'.repeat(20_000) }) }),
        res,
      );

      expect(recorded.status).toBe(400);
    });
  });

  describe('validation', () => {
    it('accepts a valid submission with 202 and a structured body', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: validBody }), res);

      // Accepted, not OK: the submission has been taken and nothing further
      // has happened to it.
      expect(recorded.status).toBe(202);
      expect(recorded.body).toMatchObject({ status: 'received' });
    });

    it('rejects missing required fields with one message per field', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: { name: '', email: '', message: '' } }), res);

      expect(recorded.status).toBe(400);
      expect(recorded.body).toMatchObject({ code: 'validation_failed' });
      expect(Object.keys((recorded.body as { fields: object }).fields).sort()).toEqual([
        'email',
        'message',
        'name',
      ]);
    });

    it('rejects a malformed email address', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: { ...validBody, email: 'not-an-address' } }), res);

      expect(recorded.status).toBe(400);
      expect((recorded.body as { fields: { email?: string } }).fields.email).toBeDefined();
    });

    it('rejects a message beyond the length limit', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: { ...validBody, message: 'a'.repeat(2_001) } }), res);

      expect(recorded.status).toBe(400);
      expect((recorded.body as { fields: { message?: string } }).fields.message).toBeDefined();
    });

    it('applies the same rules to a request the browser never validated', () => {
      // The point of the endpoint: a submission made with curl is held to
      // exactly the standard the form is.
      const { res, recorded } = createResponse();

      handler(request({ body: { name: 'x', email: 'x', message: 'x' } }), res);

      expect(recorded.status).toBe(400);
    });

    it('ignores fields it does not know about', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: { ...validBody, isAdmin: true } }), res);

      expect(recorded.status).toBe(202);
      expect(recorded.body).not.toHaveProperty('isAdmin');
    });
  });

  describe('response hygiene', () => {
    it('marks every answer uncacheable', () => {
      const { res, recorded } = createResponse();

      handler(request({ body: validBody }), res);

      expect(recorded.headers['Cache-Control']).toBe('no-store');
    });

    it('never echoes the submission back', () => {
      // A response is not a receipt: reflecting the message would put personal
      // data into any log or proxy that records response bodies.
      const { res, recorded } = createResponse();

      handler(request({ body: validBody }), res);

      expect(JSON.stringify(recorded.body)).not.toContain('sara@example.org');
      expect(JSON.stringify(recorded.body)).not.toContain('Sara Okonkwo');
    });

    it('logs nothing about a submission', () => {
      // A contact message is a name, an address and free text. None of it
      // belongs in a build log.
      const info = jest.spyOn(console, 'info').mockImplementation(() => {});
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { res } = createResponse();

      handler(request({ body: validBody }), res);

      expect(info).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();

      info.mockRestore();
      warn.mockRestore();
    });
  });
});
