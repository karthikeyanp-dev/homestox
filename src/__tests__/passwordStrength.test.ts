import { describe, it, expect } from 'vitest';
import {
  evaluatePasswordStrength,
  strengthLabelColor,
  strengthLabelCopy,
  type PasswordStrengthLabel,
} from '../utils/passwordStrength';

describe('evaluatePasswordStrength', () => {
  it('treats an empty password as "empty" with a zero score', () => {
    const result = evaluatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('empty');
    expect(result.satisfiedCount).toBe(0);
    expect(result.rules.every((r) => r.passed === false)).toBe(true);
  });

  it('treats null/undefined input as empty', () => {
    expect(evaluatePasswordStrength(null as unknown as string).label).toBe('empty');
    expect(evaluatePasswordStrength(undefined as unknown as string).label).toBe('empty');
  });

  it('reports each rule as passed when its character class is present', () => {
    const result = evaluatePasswordStrength('Abc123!@');
    const byId = Object.fromEntries(result.rules.map((r) => [r.id, r.passed]));
    expect(byId.length).toBe(true); // 8 chars
    expect(byId.lowercase).toBe(true);
    expect(byId.uppercase).toBe(true);
    expect(byId.number).toBe(true);
    expect(byId.symbol).toBe(true);
    expect(result.satisfiedCount).toBe(5);
  });

  it('scores a short all-lowercase password as weak (<40)', () => {
    const result = evaluatePasswordStrength('abc');
    expect(result.satisfiedCount).toBe(1); // lowercase only
    expect(result.score).toBeLessThan(40);
    expect(result.label).toBe('weak');
  });

  it('scores a length-only password below the good threshold as fair', () => {
    // 8 lowercase letters: length (40) + lowercase (15) = 55 -> fair
    const result = evaluatePasswordStrength('password');
    expect(result.score).toBe(55);
    expect(result.label).toBe('fair');
  });

  it('scores a password satisfying 4 of 5 rules as good (<100)', () => {
    // length + lower + upper + number, no symbol = 40 + 15 + 15 + 15 = 85
    const result = evaluatePasswordStrength('Abcdef12');
    expect(result.score).toBe(85);
    expect(result.label).toBe('good');
  });

  it('scores a fully-compliant password as strong (100)', () => {
    const result = evaluatePasswordStrength('Abcdef12!');
    expect(result.score).toBe(100);
    expect(result.label).toBe('strong');
    expect(result.satisfiedCount).toBe(5);
  });

  it('does not count the length rule as passed below 8 characters', () => {
    const result = evaluatePasswordStrength('Aa1!');
    const lengthRule = result.rules.find((r) => r.id === 'length');
    expect(lengthRule?.passed).toBe(false);
    // 7 chars with every class except length is not "strong"
    expect(result.label).not.toBe('strong');
  });

  it('uses stable rule ids suitable as React keys', () => {
    const result = evaluatePasswordStrength('Whatever1!');
    const ids = result.rules.map((r) => r.id);
    expect(ids).toEqual(['length', 'lowercase', 'uppercase', 'number', 'symbol']);
  });
});

describe('strengthLabelColor', () => {
  const palette = {
    weak: '#EF4444',
    fair: '#F59E0B',
    good: '#06B6D4',
    strong: '#6366F1',
    empty: '#CBD5E1',
  };

  it.each([
    ['weak', palette.weak],
    ['fair', palette.fair],
    ['good', palette.good],
    ['strong', palette.strong],
    ['empty', palette.empty],
  ] as [PasswordStrengthLabel, string][])(
    'returns the matching color for %s',
    (label, expected) => {
      expect(strengthLabelColor(label, palette)).toBe(expected);
    },
  );

  it('falls back to the weak color when empty and no empty color is supplied', () => {
    expect(
      strengthLabelColor('empty', {
        weak: palette.weak,
        fair: palette.fair,
        good: palette.good,
        strong: palette.strong,
      }),
    ).toBe(palette.weak);
  });
});

describe('strengthLabelCopy', () => {
  it.each([
    ['weak', 'Weak'],
    ['fair', 'Fair'],
    ['good', 'Good'],
    ['strong', 'Strong'],
  ] as [PasswordStrengthLabel, string][])('returns "%s" copy for %s label', (label, copy) => {
    expect(strengthLabelCopy(label)).toBe(copy);
  });

  it('returns an empty string for the empty label', () => {
    expect(strengthLabelCopy('empty')).toBe('');
  });
});
