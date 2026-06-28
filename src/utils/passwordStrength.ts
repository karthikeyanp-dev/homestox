// Pure password-strength evaluation logic.
//
// Kept free of React / React Native dependencies so it can be unit-tested
// under Vitest's jsdom runner alongside the other pure utilities.

export interface PasswordRule {
  /** Stable id used as a React key and for lookups. */
  id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'symbol';
  /** Human-readable description shown in the checklist UI. */
  label: string;
  /** Whether this rule is currently satisfied by the password. */
  passed: boolean;
}

export type PasswordStrengthLabel =
  | 'empty'
  | 'weak'
  | 'fair'
  | 'good'
  | 'strong';

export interface PasswordStrengthResult {
  /** 0–100, proportional to satisfied weighted rules. */
  score: number;
  /** Coarse bucket derived from the score. */
  label: PasswordStrengthLabel;
  /** Per-rule pass/fail breakdown for the checklist UI. */
  rules: PasswordRule[];
  /** Count of satisfied rules. */
  satisfiedCount: number;
}

const RULE_WEIGHTS: Record<PasswordRule['id'], number> = {
  length: 40,
  uppercase: 15,
  lowercase: 15,
  number: 15,
  symbol: 15,
};

const MIN_LENGTH = 8;

/** Tests whether a password contains a given character class. */
function hasCharClass(value: string, regex: RegExp): boolean {
  return regex.test(value);
}

/**
 * Evaluates a password against a 4–5 rule checklist (length, mixed case,
 * number, symbol) and returns a normalized 0–100 score plus a coarse label.
 *
 * The empty string maps to a 0 score and an "empty" label so the UI can hide
 * the meter until the user starts typing.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const value = password ?? '';

  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: `At least ${MIN_LENGTH} characters`,
      passed: value.length >= MIN_LENGTH,
    },
    {
      id: 'lowercase',
      label: 'A lowercase letter',
      passed: hasCharClass(value, /[a-z]/),
    },
    {
      id: 'uppercase',
      label: 'An uppercase letter',
      passed: hasCharClass(value, /[A-Z]/),
    },
    {
      id: 'number',
      label: 'A number',
      passed: hasCharClass(value, /[0-9]/),
    },
    {
      id: 'symbol',
      label: 'A symbol (!@#$…)',
      passed: hasCharClass(value, /[^A-Za-z0-9]/),
    },
  ];

  const satisfiedCount = rules.filter((r) => r.passed).length;

  if (value.length === 0) {
    return { score: 0, label: 'empty', rules, satisfiedCount: 0 };
  }

  const score = rules.reduce(
    (total, rule) => total + (rule.passed ? RULE_WEIGHTS[rule.id] : 0),
    0,
  );

  let label: PasswordStrengthLabel;
  if (score < 40) label = 'weak';
  else if (score < 70) label = 'fair';
  else if (score < 100) label = 'good';
  else label = 'strong';

  return { score, label, rules, satisfiedCount };
}

/** Hex color for the strength bar, themed by bucket. */
export function strengthLabelColor(
  label: PasswordStrengthLabel,
  colors: { weak: string; fair: string; good: string; strong: string; empty?: string },
): string {
  switch (label) {
    case 'weak':
      return colors.weak;
    case 'fair':
      return colors.fair;
    case 'good':
      return colors.good;
    case 'strong':
      return colors.strong;
    case 'empty':
    default:
      return colors.empty ?? colors.weak;
  }
}

/** Display copy for each bucket. */
export function strengthLabelCopy(label: PasswordStrengthLabel): string {
  switch (label) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    case 'empty':
    default:
      return '';
  }
}
