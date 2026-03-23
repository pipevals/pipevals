import { describe, expect, test, mock, beforeEach } from "bun:test";
import { fetcher } from "@/lib/fetcher";

const originalFetch = globalThis.fetch;

describe("fetcher", () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns parsed JSON on success", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ id: "123" }), { status: 200 })),
    ) as typeof fetch;

    const result = await fetcher<{ id: string }>("/api/test");
    expect(result.id).toBe("123");
  });

  test("throws with server error message on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Pipeline not found" }), { status: 404 }),
      ),
    ) as typeof fetch;

    await expect(fetcher("/api/test")).rejects.toThrow("Pipeline not found");
  });

  test("throws with status code when response body is not JSON", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500 })),
    ) as typeof fetch;

    await expect(fetcher("/api/test")).rejects.toThrow("Request failed: 500");
  });

  test("throws with status code when response has no error field", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "something" }), { status: 403 }),
      ),
    ) as typeof fetch;

    await expect(fetcher("/api/test")).rejects.toThrow("Request failed: 403");
  });
});
