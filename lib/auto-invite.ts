import type { db } from "./db";
import { isAutoInviteAllowedHostname } from "./app-hosts";

export const DEFAULT_ORG_SLUG = "demo";

export function isAutoInviteEnabled(): boolean {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) return false;
  try {
    return isAutoInviteAllowedHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

type OrgQueryDb = Pick<typeof db, "query">;

type AddMemberFn = (params: {
  body: { userId: string; organizationId: string; role: string };
}) => Promise<unknown>;

export function createAutoInviteHook(db: OrgQueryDb, addMember: AddMemberFn) {
  return async (user: { id: string }): Promise<void> => {
    if (!isAutoInviteEnabled()) return;
    try {
      const org = await db.query.organization.findFirst({
        where: (o, { eq }) => eq(o.slug, DEFAULT_ORG_SLUG),
      });
      if (!org) {
        console.warn(
          `[auto-invite] Demo org not found (slug: "${DEFAULT_ORG_SLUG}"). Run the seed script.`,
        );
        return;
      }
      await addMember({
        body: { userId: user.id, organizationId: org.id, role: "guest" },
      });
    } catch (err) {
      console.error("[auto-invite] Failed to add user to demo org:", err);
    }
  };
}
