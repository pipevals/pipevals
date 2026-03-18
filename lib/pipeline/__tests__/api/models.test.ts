import { describe, expect, test, mock, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser } from "./setup";

await setupMocks();

// Mock the gateway.getAvailableModels() call
const getAvailableModels = mock(() =>
  Promise.resolve({
    models: [
      { id: "openai/gpt-4o", name: "GPT-4o", modelType: "language" },
      { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", modelType: "language" },
      { id: "openai/dall-e-3", name: "DALL-E 3", modelType: "image" },
    ],
  }),
);

mock.module("ai", () => ({
  gateway: { getAvailableModels },
}));

const { GET } = await import("@/app/api/models/route");

describe("GET /api/models", () => {
  const originalEnv = process.env.AI_GATEWAY_API_KEY;

  beforeAll(async () => {
    const ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  test("returns 401 when unauthenticated", async () => {
    const savedHeaders = (await import("./setup")).headerState.current;
    setActiveHeaders(new Headers());

    const res = await GET();
    expect(res.status).toBe(401);

    setActiveHeaders(savedHeaders);
  });

  test("returns language models mapped to { id, name, provider }", async () => {
    process.env.AI_GATEWAY_API_KEY = "test";
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.models).toHaveLength(2); // image model filtered out
    expect(data.models[0]).toEqual({
      id: "anthropic/claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      provider: "anthropic",
    });
    expect(data.models[1]).toEqual({
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "openai",
    });
  });

  test("returns public models with fallback when AI_GATEWAY_API_KEY is missing", async () => {
    delete process.env.AI_GATEWAY_API_KEY;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL) => {
      if (String(url).includes("ai-gateway.vercel.sh")) {
        return Response.json({
          data: [
            { id: "openai/gpt-4o", name: "GPT-4o", type: "language", owned_by: "openai" },
            { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "language", owned_by: "anthropic" },
          ],
        });
      }
      return originalFetch(url as URL);
    }) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.models).toHaveLength(2);
    expect(data.fallback).toBe(true);

    globalThis.fetch = originalFetch;
    process.env.AI_GATEWAY_API_KEY = originalEnv;
  });

  test("returns public models with fallback when gateway throws", async () => {
    process.env.AI_GATEWAY_API_KEY = "test";
    getAvailableModels.mockImplementationOnce(() => {
      throw new Error("auth or network error");
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL) => {
      if (String(url).includes("ai-gateway.vercel.sh")) {
        return Response.json({
          data: [
            { id: "openai/gpt-4o", name: "GPT-4o", type: "language", owned_by: "openai" },
            { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "language", owned_by: "anthropic" },
          ],
        });
      }
      return originalFetch(url as URL);
    }) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.models).toHaveLength(2);
    expect(data.fallback).toBe(true);
    expect(data.models[0]).toEqual({
      id: "anthropic/claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      provider: "anthropic",
    });

    globalThis.fetch = originalFetch;
  });

  test("returns empty array when gateway and public fetch both fail", async () => {
    process.env.AI_GATEWAY_API_KEY = "test";
    getAvailableModels.mockImplementationOnce(() => {
      throw new Error("auth error");
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async (url: string | URL) => {
      if (String(url).includes("ai-gateway.vercel.sh")) {
        return Response.json({}, { status: 500 });
      }
      return originalFetch(url as URL);
    }) as unknown as typeof fetch;

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.models).toEqual([]);
    expect(data.fallback).toBeUndefined();

    globalThis.fetch = originalFetch;
  });
});
