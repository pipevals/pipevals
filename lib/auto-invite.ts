export const DEFAULT_ORG_SLUG = "demo";

const AUTO_INVITE_HOSTS = new Set(["localhost", "pipevals.com"]);

export function isAutoInviteEnabled(): boolean {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) return false;
  try {
    return AUTO_INVITE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}
