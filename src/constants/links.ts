/**
 * External URLs and contact addresses used across the app.
 *
 * Centralised because these same values have to match the Play Console
 * listing exactly — a privacy policy URL that differs between the app and the
 * store entry is a review finding. Change them here and everywhere follows.
 *
 * The site is served from Firebase Hosting with `cleanUrls: true` (mirroring
 * the CatchAll site), so the extension-less paths below resolve to the
 * corresponding .html files.
 */

export const SITE_URL = 'https://homestox.codedelights.com';

export const LEGAL_URLS = {
    privacy: `${SITE_URL}/privacy`,
    terms: `${SITE_URL}/terms`,
    /** Web path for account deletion requests, required by Google Play. */
    dataDeletion: `${SITE_URL}/data-deletion`,
    support: `${SITE_URL}/support`,
} as const;

export const SUPPORT_EMAIL = 'support@codedelights.com';

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
