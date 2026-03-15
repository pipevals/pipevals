import { describe, expect, test, mock, beforeAll } from "bun:test";
import { setupTestDb, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb, auth: testAuth } = await setupTestDb();

let activeHeaders: Headers;

mock.module("next/headers", () => ({
  headers: () => Promise.resolve(activeHeaders),
}));

mock.module("@/lib/auth", () => ({ auth: testAuth }));
mock.module("@/lib/db", () => ({ db: testDb }));

const { GET: listPipelines, POST: createPipeline } = await import(
  "@/app/api/pipelines/route"
);
const {
  GET: getPipeline,
  PUT: updatePipeline,
  DELETE: deletePipeline,
} = await import("@/app/api/pipelines/[id]/route");
const { pipelines, pipelineNodes, pipelineEdges } = await import(
  "@/lib/db/pipeline-schema"
);

let ctx: TestContext;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postJson(body: unknown) {
  return new Request("http://localhost/api/pipelines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(body: unknown) {
  return new Request("http://localhost/api/pipelines/x", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedPipeline(name?: string) {
  const id = crypto.randomUUID();
  await testDb.insert(pipelines).values({
    id,
    name: name ?? `pipeline-${id.slice(0, 8)}`,
    organizationId: ctx.organizationId,
    createdBy: ctx.userId,
  });
  return id;
}

async function seedGraph(pipelineId: string) {
  const n1 = crypto.randomUUID();
  const n2 = crypto.randomUUID();
  await testDb.insert(pipelineNodes).values([
    { id: n1, pipelineId, type: "api_request", label: "Fetch", config: {}, positionX: 0, positionY: 0 },
    { id: n2, pipelineId, type: "transform", label: "Map", config: {}, positionX: 200, positionY: 0 },
  ]);
  await testDb.insert(pipelineEdges).values({
    id: crypto.randomUUID(),
    pipelineId,
    sourceNodeId: n1,
    targetNodeId: n2,
  });
  return { n1, n2 };
}

describe("pipeline CRUD (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    activeHeaders = ctx.headers;
  });

  describe("POST /api/pipelines", () => {
    test("201 on create", async () => {
      const res = await createPipeline(
        postJson({ name: "GPT-4o Eval", description: "Test pipeline" }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe("GPT-4o Eval");
      expect(data.organizationId).toBe(ctx.organizationId);
      expect(data.createdBy).toBe(ctx.userId);
    });

    test("409 on duplicate name", async () => {
      await createPipeline(postJson({ name: "Unique Name" }));

      const res = await createPipeline(postJson({ name: "Unique Name" }));
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    test("400 on missing name", async () => {
      const res = await createPipeline(postJson({}));
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/pipelines", () => {
    test("200 on list", async () => {
      const res = await listPipelines();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/pipelines/:id", () => {
    test("200 on get with graph", async () => {
      const pipelineId = await seedPipeline();
      const { n1 } = await seedGraph(pipelineId);

      const res = await getPipeline(
        new Request("http://localhost"),
        makeParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
      expect(data.nodes[0].position).toBeDefined();
      expect(data.nodes[0].position.x).toBeNumber();
      expect(data.edges[0].source).toBe(n1);
    });

    test("404 on missing pipeline", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        makeParams("nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/pipelines/:id", () => {
    test("200 on valid PUT", async () => {
      const pipelineId = await seedPipeline();
      const n1 = crypto.randomUUID();
      const n2 = crypto.randomUUID();

      const body = {
        name: "Updated",
        nodes: [
          { id: n1, type: "api_request", position: { x: 0, y: 0 }, data: { label: "API" } },
          { id: n2, type: "transform", position: { x: 100, y: 0 }, data: { label: "T" } },
        ],
        edges: [
          { id: crypto.randomUUID(), source: n1, target: n2 },
        ],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(200);

      // Verify the graph persisted
      const getRes = await getPipeline(
        new Request("http://localhost"),
        makeParams(pipelineId),
      );
      const data = await getRes.json();
      expect(data.name).toBe("Updated");
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
    });

    test("400 on cyclic graph", async () => {
      const pipelineId = await seedPipeline();
      const nId = crypto.randomUUID();

      const body = {
        nodes: [
          { id: nId, type: "api_request", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [
          { id: crypto.randomUUID(), source: nId, target: nId },
        ],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid graph");
    });

    test("400 on oversized graph", async () => {
      const pipelineId = await seedPipeline();
      const nodes = Array.from({ length: 51 }, (_, i) => ({
        id: crypto.randomUUID(),
        type: "transform" as const,
        position: { x: i * 100, y: 0 },
        data: { label: `Node ${i}` },
      }));

      const res = await updatePipeline(
        putJson({ nodes, edges: [] }),
        makeParams(pipelineId),
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.details).toBeDefined();
    });

    test("404 on missing pipeline", async () => {
      const res = await updatePipeline(
        putJson({ nodes: [], edges: [] }),
        makeParams("nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/pipelines/:id", () => {
    test("204 on delete", async () => {
      const pipelineId = await seedPipeline();

      const res = await deletePipeline(
        new Request("http://localhost", { method: "DELETE" }),
        makeParams(pipelineId),
      );
      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await getPipeline(
        new Request("http://localhost"),
        makeParams(pipelineId),
      );
      expect(getRes.status).toBe(404);
    });

    test("404 on missing pipeline", async () => {
      const res = await deletePipeline(
        new Request("http://localhost", { method: "DELETE" }),
        makeParams("nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });
});
