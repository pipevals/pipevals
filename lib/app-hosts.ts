/** Production hostnames (apex + www). Single source for CSRF trusted origins and auto-invite allowlist. */
export const SITE_HOSTNAMES = ["pipevals.com", "www.pipevals.com"] as const;

export const SITE_TRUSTED_ORIGINS: string[] = SITE_HOSTNAMES.map(
  (h) => `https://${h}`,
);

const AUTO_INVITE_ALLOWED_HOSTNAMES = new Set<string>([
  "localhost",
  ...SITE_HOSTNAMES,
]);

export function isAutoInviteAllowedHostname(hostname: string): boolean {
  return AUTO_INVITE_ALLOWED_HOSTNAMES.has(hostname);
}
