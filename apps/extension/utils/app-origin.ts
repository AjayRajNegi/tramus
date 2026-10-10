export const APP_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "https://staging.tramus.dev",
];

export const APP_MATCH_PATTERNS: string[] = APP_ORIGINS.map((origin) => {
  const { protocol, hostname } = new URL(origin);
  return `${protocol}//${hostname}/*`;
});

export function isAllowedOrigin(origin: string): boolean {
  return APP_ORIGINS.includes(origin);
}
