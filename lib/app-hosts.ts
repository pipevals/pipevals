/** Single source for CSRF trusted origins and auto-invite allowlist. */
export const SITE_HOSTNAMES = ["pipevals.com", "www.pipevals.com"] as const;

function buildTrustedOrigins(): string[] {
  const origins: string[] = SITE_HOSTNAMES.map((h) => `https://${h}`);
  if (process.env.NODE_ENV !== "production") {
    const dev = process.env.BETTER_AUTH_URL;
    if (dev) origins.push(dev);
  }
  return origins;
}

export const SITE_TRUSTED_ORIGINS: string[] = buildTrustedOrigins();

const AUTO_INVITE_ALLOWED_HOSTNAMES = new Set<string>([
  ...(process.env.NODE_ENV !== "production" ? ["localhost"] : []),
  ...SITE_HOSTNAMES,
]);

export function isAutoInviteAllowedHostname(hostname: string): boolean {
  return AUTO_INVITE_ALLOWED_HOSTNAMES.has(hostname);
}
