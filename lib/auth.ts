import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { db } from "./db";
import { guestRole, createGuestHooks } from "./auth-guest";
import { isAutoInviteEnabled, DEFAULT_ORG_SLUG } from "./auto-invite";

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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
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
            await auth.api.addMember({
              body: {
                userId: user.id,
                organizationId: org.id,
                role: "guest",
              },
            });
          } catch (err) {
            console.error("[auto-invite] Failed to add user to demo org:", err);
          }
        },
      },
    },
  },
  hooks: createGuestHooks(db),
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
