import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { defaultAc } from "better-auth/plugins/organization/access";
import type { Role } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { db } from "./db";

const guestRole = defaultAc.newRole({}) as unknown as Role<Record<string, string[]>>;

const GUEST_ALLOWED_ORG_PATHS = new Set([
  "/organization/set-active",
  "/organization/get-full-organization",
  "/organization/list",
]);

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and at least 32 characters long. " +
      "Generate one with: openssl rand -base64 32",
  );
}

export const auth = betterAuth({
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    storage: "memory",
  },
  hooks: {
    before: createAuthMiddleware(async (ctx: {
      path: string;
      context: { session?: { user: { id: string }; session: Record<string, unknown> } | null };
    }) => {
      if (!ctx.path.startsWith("/organization/")) return;
      if (GUEST_ALLOWED_ORG_PATHS.has(ctx.path)) return;

      const session = ctx.context.session;
      if (!session) return;

      const activeOrgId = (session.session as Record<string, unknown>)
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
  },
  plugins: [
    organization({
      organizationLimit: 5,
      membershipLimit: 100,
      roles: { guest: guestRole },
    }),
    admin(),
    bearer(),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
