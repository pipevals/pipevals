import { NextResponse } from "next/server";
import { gateway } from "ai";
import { requireAuth } from "@/lib/api/auth";
import type { GatewayModel } from "@/lib/pipeline/types";

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

async function fetchPublicModels(): Promise<GatewayModel[]> {
  const res = await fetch(GATEWAY_MODELS_URL);
  if (!res.ok) return [];
  const data = await res.json();
  const items = data?.data ?? [];
  return items
    .filter((m: { type?: string }) => m.type === "language")
    .map((m: { id: string; name?: string; owned_by?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
      provider: m.id.split("/")[0],
    }))
    .sort((a: GatewayModel, b: GatewayModel) => a.id.localeCompare(b.id));
}

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const hasGatewayKey = Boolean(process.env.AI_GATEWAY_API_KEY);

  if (hasGatewayKey) {
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
      // Fall through to public models endpoint
    }
  }

  const models = await fetchPublicModels();
  return NextResponse.json(
    models.length > 0 ? { models, fallback: true } : { models: [] },
  );
}
