import { describe, expect, test, beforeAll } from "bun:test";
import {
  setupMocks,
  setActiveHeaders,
  createAuthenticatedUser,
  createGuestInOrg,
  createApiKeyForUser,
  type TestContext,
} from "./setup";

const { db: testDb } = await setupMocks();

const { POST: triggerRun } = await import(
  "@/app/api/pipelines/[id]/runs/route"
);
const { PUT: updatePipeline } = await import(
  "@/app/api/pipelines/[id]/route"
);

const { pipelines, pipelineNodes, pipelineEdges } = await import(
  "@/lib/db/pipeline-schema"
);

let owner: TestContext;
let apiKeyHeaders: Headers;
let pipelineId: string;

function runsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function pipelineParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postJson(body: unknown) {
  return new Request("http://localhost/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(body: unknown) {
  return new Request("http://localhost", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedPipeline(organizationId: string, createdBy: string) {
  const id = crypto.randomUUID();
  const name = `pipeline-${id.slice(0, 8)}`;
  await testDb.insert(pipelines).values({
    id,
    name,
    slug: name,
    organizationId,
    createdBy,
  });

  const n1 = crypto.randomUUID();
  const n2 = crypto.randomUUID();
  await testDb.insert(pipelineNodes).values([
    { id: n1, pipelineId: id, type: "api_request", label: "Fetch", config: { url: "https://example.com", method: "GET" } },
    { id: n2, pipelineId: id, type: "transform", label: "Map", config: { mapping: {} } },
  ]);
  await testDb.insert(pipelineEdges).values({
    id: crypto.randomUUID(),
    pipelineId: id,
    sourceNodeId: n1,
    targetNodeId: n2,
  });

  return id;
}

describe("API key authentication", () => {
  beforeAll(async () => {
    owner = await createAuthenticatedUser();
    const { apiKeyHeaders: akHeaders } = await createApiKeyForUser(owner.headers);
    apiKeyHeaders = akHeaders;
    pipelineId = await seedPipeline(owner.organizationId, owner.userId);
  });

  describe("POST /api/pipelines/:id/runs (whitelisted)", () => {
    test("202 with valid API key", async () => {
      setActiveHeaders(apiKeyHeaders);

      const res = await triggerRun(postJson({ prompt: "test" }), runsParams(pipelineId));
      expect(res.status).toBe(202);

      const data = await res.json();
      expect(data.runId).toBeDefined();
    });

    test("401 with invalid API key", async () => {
      setActiveHeaders(new Headers({ "x-api-key": "invalid-key-value" }));

      const res = await triggerRun(postJson({ prompt: "test" }), runsParams(pipelineId));
      expect(res.status).toBe(401);
    });

    test("401 with no auth at all", async () => {
      setActiveHeaders(new Headers());

      const res = await triggerRun(postJson({ prompt: "test" }), runsParams(pipelineId));
      expect(res.status).toBe(401);
    });

    test("404 when API key user is not a member of the pipeline's org", async () => {
      // Create a separate user in a different org with their own API key
      const outsider = await createAuthenticatedUser();
      const { apiKeyHeaders: outsiderKeyHeaders } = await createApiKeyForUser(outsider.headers);

      setActiveHeaders(outsiderKeyHeaders);

      const res = await triggerRun(postJson({ prompt: "test" }), runsParams(pipelineId));
      expect(res.status).toBe(404);
    });

    test("403 when API key user is a guest in the org", async () => {
      const guest = await createGuestInOrg(owner.organizationId);
      const { apiKeyHeaders: guestKeyHeaders } = await createApiKeyForUser(guest.headers);

      setActiveHeaders(guestKeyHeaders);

      const res = await triggerRun(postJson({ prompt: "test" }), runsParams(pipelineId));
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/pipelines/:id (not whitelisted)", () => {
    test("401 when using API key on non-whitelisted endpoint", async () => {
      setActiveHeaders(apiKeyHeaders);

      const res = await updatePipeline(
        putJson({ name: "updated", nodes: [], edges: [] }),
        pipelineParams(pipelineId),
      );
      // API key is ignored on non-whitelisted routes, so this falls through
      // to cookie auth which finds no session → 401
      expect(res.status).toBe(401);
    });
  });
});
