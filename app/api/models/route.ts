import { NextResponse } from "next/server";
import { gateway } from "ai";
import type { GatewayModel } from "@/lib/pipeline/types";

export async function GET() {
  try {
    const { models: raw } = await gateway.getAvailableModels();
    const models: GatewayModel[] = raw
      .filter((m) => m.modelType === "language")
      .map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        provider: m.id.split("/")[0],
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
