import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { admin } from "better-auth/plugins/admin";
import { apiKey } from "@better-auth/api-key";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { apikey } from "./db/auth-schema";
import { guestRole, createGuestHooks } from "./auth-guest";
import { SITE_TRUSTED_ORIGINS } from "./app-hosts";
import { createAutoInviteHook } from "./auto-invite";

type AddMemberParams = {
  body: { userId: string; organizationId: string; role: string };
};

let addMemberFn: (params: AddMemberParams) => Promise<unknown>;

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be set and at least 32 characters long. " +
    "Generate one with: openssl rand -base64 32",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  secret,
  trustedOrigins: [...SITE_TRUSTED_ORIGINS],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      receiveUpdates: {
        type: "boolean",
        defaultValue: false,
        required: true,
      },
    },
  },
  emailAndPassword: {
    enabled: !isProduction,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    storage: "memory",
  },
  databaseHooks: {
    user: {
      create: {
        after: createAutoInviteHook(db, (params) => addMemberFn(params)),
      },
      delete: {
        before: async (user) => {
          await db
            .update(apikey)
            .set({ enabled: false })
            .where(eq(apikey.referenceId, user.id));
          return true;
        },
      },
    },
  },
  hooks: createGuestHooks(db),
  plugins: [
    organization({
      allowUserToCreateOrganization: false,
      organizationLimit: 5,
      membershipLimit: 100,
      roles: { guest: guestRole },
    }),
    admin(),
    apiKey({
      apiKeyHeaders: ["x-api-key"],
      keyExpiration: {
        defaultExpiresIn: 1000 * 60 * 60 * 24 * 90, // 90 days in ms
      },
      rateLimit: {
        enabled: true,
        timeWindow: 60_000, // 1 minute
        maxRequests: 60, // 60 req/min per key
      },
    }),
    nextCookies(),
  ],
});

addMemberFn = (params) =>
  auth.api.addMember({
    body: { ...params.body, role: "guest" as const },
  });

export type Session = typeof auth.$Infer.Session;
