import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../utils/emailValidation';

describe('isValidEmail', () => {
  it.each([
    'user@example.com',
    'name.surname@example.co.uk',
    'a@b.io',
    'user+tag@domain.com',
    'user_name@domain.com',
    'USER@DOMAIN.COM',
  ])('accepts a well-formed email: %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'plaintext',
    'missing@tld',
    '@nodomain.com',
    'user@.com',
    'user@domain.',
    'user name@example.com',
  ])('rejects a malformed email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('handles null/undefined input without throwing', () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
  });
});
