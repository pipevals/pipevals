import { describe, expect, test, mock } from "bun:test";

// Mock auth — return a valid session so the route proceeds
mock.module("@/lib/api/auth", () => ({
  requireAuth: () =>
    Promise.resolve({
      userId: "u1",
      organizationId: "o1",
      session: {},
    }),
}));

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
  test("returns language models mapped to { id, name, provider }", async () => {
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

  test("returns empty array when gateway throws", async () => {
    getAvailableModels.mockImplementationOnce(() => {
      throw new Error("network error");
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.models).toEqual([]);
  });
});
