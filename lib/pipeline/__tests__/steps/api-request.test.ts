import { describe, expect, test, mock, beforeEach } from "bun:test";
import { apiRequestHandler } from "../../steps/api-request";
import type { ApiRequestConfig, StepInput } from "../../types";

const emptyInput: StepInput = { steps: {}, trigger: {} };

function mockFetch(status: number, body: unknown) {
  return mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

describe("apiRequestHandler", () => {
  beforeEach(() => {
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = mockFetch(200, { ok: true });
  });

  test("successful GET returns status and body", async () => {
    const config: ApiRequestConfig = {
      type: "api_request",
      url: "https://api.example.com/data",
      method: "GET",
    };

    const result = await apiRequestHandler(config, emptyInput);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });

  test("POST sends resolved body template", async () => {
    let capturedInit: RequestInit | undefined;
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = mock((url: string, init: RequestInit) => {
      capturedInit = init;
      return Promise.resolve(
        new Response(JSON.stringify({ received: true }), { status: 200 }),
      );
    });

    const config: ApiRequestConfig = {
      type: "api_request",
      url: "https://api.example.com/check",
      method: "POST",
      bodyTemplate: { text: "steps.llm.response" },
    };
    const input: StepInput = {
      steps: { llm: { response: "hello world" } },
      trigger: {},
    };

    await apiRequestHandler(config, input);
    expect(capturedInit?.body).toBe(JSON.stringify({ text: "hello world" }));
  });

  test("non-2xx response throws error with status", async () => {
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = mockFetch(404, { error: "not found" });

    const config: ApiRequestConfig = {
      type: "api_request",
      url: "https://api.example.com/missing",
      method: "GET",
    };

    expect(apiRequestHandler(config, emptyInput)).rejects.toThrow("404");
  });

  test("resolves dot-path in URL", async () => {
    let capturedUrl: string | undefined;
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const config: ApiRequestConfig = {
      type: "api_request",
      url: "trigger.endpoint",
      method: "GET",
    };
    const input: StepInput = {
      steps: {},
      trigger: { endpoint: "https://resolved.example.com" },
    };

    await apiRequestHandler(config, input);
    expect(capturedUrl).toBe("https://resolved.example.com");
  });
});
