import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { defaultAc } from "better-auth/plugins/organization/access";
import type { Role } from "better-auth/plugins/access";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./db/schema";

export const guestRole = defaultAc.newRole({}) as unknown as Role<
  Record<string, string[]>
>;

export const GUEST_ALLOWED_ORG_PATHS = new Set([
  "/organization/set-active",
  "/organization/get-full-organization",
  "/organization/list",
  "/organization/get-active-member",
  "/organization/get-active-member-role",
]);

/** API key write endpoints that guests must not access. */
const GUEST_BLOCKED_API_KEY_PATHS = new Set([
  "/api-key/create",
  "/api-key/delete",
  "/api-key/delete-all-expired-api-keys",
  "/api-key/update",
]);

export function createGuestHooks(db: PgDatabase<any, typeof schema>) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      const isOrgPath = ctx.path.startsWith("/organization/");
      const isBlockedApiKeyPath = GUEST_BLOCKED_API_KEY_PATHS.has(ctx.path);

      if (!isOrgPath && !isBlockedApiKeyPath) return;
      if (isOrgPath && GUEST_ALLOWED_ORG_PATHS.has(ctx.path)) return;

      const session = await getSessionFromCtx(ctx);
      if (!session) return;

      const activeOrgId = session.session
        .activeOrganizationId as string | undefined;
      if (!activeOrgId) return;

      const memberRecord = await db.query.member.findFirst({
        where: (m, { and, eq }) =>
          and(
            eq(m.userId, session.user.id),
            eq(m.organizationId, activeOrgId),
          ),
      });

      if (memberRecord?.role === "guest") {
        throw new APIError("FORBIDDEN", {
          message: "Insufficient permissions",
        });
      }
    }),
  };
}
