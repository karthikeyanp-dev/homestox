// Pure email-shape validation helper.
//
// Kept free of React / React Native dependencies so it can be unit-tested
// under Vitest's jsdom runner. This is a client-side shape check only — it
// does not guarantee deliverability; the authoritative check is Supabase's
// email confirmation flow.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when the string looks like a valid email address. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test((email ?? '').trim());
}
