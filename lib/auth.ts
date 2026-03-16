import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { db } from "./db";
import { guestRole, createGuestHooks } from "./auth-guest";

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
