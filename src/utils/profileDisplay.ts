import { Profile } from '../types';

type NameSource = Pick<Partial<Profile>, 'full_name' | 'email'>;

/**
 * Human-friendly name for a profile: full name, else the email local-part,
 * else the provided fallback.
 */
export function getDisplayName(source?: NameSource | null, fallback = 'User'): string {
    return source?.full_name?.trim() || source?.email?.split('@')[0] || fallback;
}

/**
 * Up to two uppercase initials derived from a display name.
 * Multi-word names use the first letter of the first two words ("John Doe" -> "JD");
 * single-word names use their first two letters ("codedelights" -> "CO").
 */
export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}
