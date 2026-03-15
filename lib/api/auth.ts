import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Gets the authenticated session with an active organization.
 * Returns the session or a 401/403 Response.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return {
      error: NextResponse.json(
        { error: "No active organization. Set one first." },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    userId: session.user.id,
    organizationId,
  };
}
