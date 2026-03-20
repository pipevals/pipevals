import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const preferencesSchema = z.object({
  receiveUpdates: z.boolean(),
});

export async function PATCH(request: Request) {
  const authResult = await requireAuth({ withRole: true });
  if ("error" in authResult) return authResult.error;

  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  await db
    .update(user)
    .set({ receiveUpdates: parsed.data.receiveUpdates })
    .where(eq(user.id, authResult.userId));

  return NextResponse.json({ ok: true });
}
