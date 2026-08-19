import { CONTACT_LIMITS } from '@/types/contact';
import { orderedErrorFields, validateContact } from './validation';

/**
 * Contact validation.
 *
 * This module runs on both sides of the network, so it is tested directly
 * rather than only through the form or the endpoint: a rule that is wrong here
 * is wrong in two places at once.
 */

const valid = {
  name: 'Sara Okonkwo',
  email: 'sara@example.org',
  message: 'We are replacing three patient portals and would like to talk about the migration.',
};

describe('validateContact', () => {
  it('accepts a complete submission and returns trimmed values', () => {
    const result = validateContact({
      name: '  Sara Okonkwo  ',
      email: ' sara@example.org ',
      organisation: ' Northlake ',
      message: `  ${valid.message}  `,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Sara Okonkwo',
        email: 'sara@example.org',
        organisation: 'Northlake',
        message: valid.message,
      },
    });
  });

  it('omits an empty organisation rather than sending an empty string', () => {
    const result = validateContact({ ...valid, organisation: '   ' });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).not.toHaveProperty('organisation');
  });

  it('reports every problem at once', () => {
    // Returning only the first would make a reader fix three mistakes in three
    // round trips.
    const result = validateContact({ name: '', email: 'nope', message: '' });

    expect(result.ok).toBe(false);
    expect(result.ok === false && Object.keys(result.errors).sort()).toEqual([
      'email',
      'message',
      'name',
    ]);
  });

  it('requires a name', () => {
    const result = validateContact({ ...valid, name: '   ' });

    expect(result.ok === false && result.errors.name).toMatch(/enter your name/i);
  });

  it.each([
    ['no at sign', 'sara.example.org'],
    ['no domain', 'sara@'],
    ['no top-level domain', 'sara@example'],
    ['an embedded space', 'sara okonkwo@example.org'],
  ])('rejects an address with %s', (_case, email) => {
    const result = validateContact({ ...valid, email });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.email).toMatch(/name@example\.com/);
  });

  it('accepts the shapes real addresses take', () => {
    // A stricter pattern locks valid senders out, which is the worse failure.
    for (const email of [
      'sara+enquiries@example.org',
      'first.last@sub.domain.example',
      "o'brien@example.co.uk",
    ]) {
      expect(validateContact({ ...valid, email }).ok).toBe(true);
    }
  });

  it('rejects a message shorter than the minimum', () => {
    const result = validateContact({ ...valid, message: 'hi' });

    expect(result.ok === false && result.errors.message).toMatch(
      new RegExp(`${CONTACT_LIMITS.message.min} characters`),
    );
  });

  it.each([
    ['name', CONTACT_LIMITS.name.max],
    ['email', CONTACT_LIMITS.email.max],
    ['organisation', CONTACT_LIMITS.organisation.max],
    ['message', CONTACT_LIMITS.message.max],
  ])('rejects a %s longer than %i characters', (field, max) => {
    // Unbounded free text is a storage problem and a denial-of-service surface.
    const filler = field === 'email' ? `${'a'.repeat(max)}@example.org` : 'a'.repeat(max + 1);
    const result = validateContact({ ...valid, [field]: filler });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors[field as 'name']).toMatch(/characters/);
  });

  it.each([[undefined], [null], ['a string'], [42], [[]]])(
    'treats %p as a submission with no fields rather than throwing',
    (input) => {
      // The server hands this whatever was posted.
      const result = validateContact(input);

      expect(result.ok).toBe(false);
      expect(result.ok === false && Object.keys(result.errors)).toEqual(
        expect.arrayContaining(['name', 'email', 'message']),
      );
    },
  );

  it('ignores fields of the wrong type instead of coercing them', () => {
    // A posted number or object must not become the string "42".
    const result = validateContact({ ...valid, name: 42 });

    expect(result.ok === false && result.errors.name).toMatch(/enter your name/i);
  });

  it('ignores unknown fields', () => {
    const result = validateContact({ ...valid, isAdmin: true, role: 'admin' });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).not.toHaveProperty('isAdmin');
  });
});

describe('orderedErrorFields', () => {
  it('lists problems in the order the fields appear in the form', () => {
    // The summary links have to match the reading and tab order of the fields.
    const errors = { message: 'm', name: 'n', email: 'e' };

    expect(orderedErrorFields(errors)).toEqual(['name', 'email', 'message']);
  });

  it('is empty when nothing is wrong', () => {
    expect(orderedErrorFields({})).toEqual([]);
  });
});
