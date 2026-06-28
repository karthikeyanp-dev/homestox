import { describe, expect, it } from 'vitest';

import { getDisplayName, getInitials } from '../utils/profileDisplay';

describe('getDisplayName', () => {
  it('returns the trimmed full name when present', () => {
    expect(getDisplayName({ full_name: '  Alice  ', email: 'alice@example.com' })).toBe('Alice');
  });

  it('falls back to the email local-part when full_name is empty', () => {
    expect(getDisplayName({ full_name: '', email: 'bob@example.com' })).toBe('bob');
  });

  it('falls back to the email local-part when full_name is only whitespace', () => {
    expect(getDisplayName({ full_name: '   ', email: 'carol@example.com' })).toBe('carol');
  });

  it('uses the provided fallback when neither full_name nor email exist', () => {
    expect(getDisplayName({}, 'Someone')).toBe('Someone');
  });

  it('defaults to "User" when no fallback is supplied', () => {
    expect(getDisplayName({})).toBe('User');
  });

  it('returns the fallback for null/undefined input', () => {
    expect(getDisplayName(null, 'Someone')).toBe('Someone');
    expect(getDisplayName(undefined, 'Someone')).toBe('Someone');
  });

  it('ignores email when full_name is present', () => {
    expect(getDisplayName({ full_name: 'Alice', email: 'alice@example.com' })).toBe('Alice');
  });
});

describe('getInitials', () => {
  it('derives initials from a two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('uses the first two letters of a single-word name', () => {
    expect(getInitials('codedelights')).toBe('CO');
  });

  it('handles leading/trailing whitespace', () => {
    expect(getInitials('  Jane Roe  ')).toBe('JR');
  });

  it('returns a single-letter initial for a one-letter name', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('returns the default initial for an empty name', () => {
    expect(getInitials('')).toBe('U');
    expect(getInitials('   ')).toBe('U');
  });

  it('only uses the first two words for longer names', () => {
    expect(getInitials('Ada Lovelace King')).toBe('AL');
  });
});
