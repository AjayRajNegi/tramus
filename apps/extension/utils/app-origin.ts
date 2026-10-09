/**
 * Single source of truth for which web-app origins may talk to the extension.
 * Used by the content script (`matches`) and the background worker (sender check).
 *
 * T-001: hard-coded list.
 * T-011: replaced by a build-time env var (production = production origin only).
 */
export const APP_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "https://staging.tramus.dev", // TODO: replace with your real staging origin
];

/** Match patterns for the content script manifest entry. */
export const APP_MATCH_PATTERNS: string[] = APP_ORIGINS.map(
  (origin) => `${origin}/*`,
);

export function isAllowedOrigin(origin: string): boolean {
  return APP_ORIGINS.includes(origin);
}
