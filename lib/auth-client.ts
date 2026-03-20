import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient(), apiKeyClient()],
});

export const { signIn, signOut, useSession } = authClient;
