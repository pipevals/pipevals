import { describe, expect, test, mock } from "bun:test";
import { setupTestDb } from "./setup";

const { db: testDb, auth: testAuth } = await setupTestDb();

mock.module("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

mock.module("@/lib/auth", () => ({ auth: testAuth }));
mock.module("@/lib/db", () => ({ db: testDb }));

mock.module("workflow/api", () => ({
  start: mock(() => Promise.resolve({ runId: "wf-mock" })),
}));
mock.module("@/lib/pipeline/walker/workflow", () => ({
  runPipelineWorkflow: () => {},
}));

const { GET: listPipelines, POST: createPipeline } = await import(
  "@/app/api/pipelines/route"
);
const {
  GET: getPipeline,
  PUT: updatePipeline,
  DELETE: deletePipeline,
} = await import("@/app/api/pipelines/[id]/route");
const { POST: triggerRun, GET: listRuns } = await import(
  "@/app/api/pipelines/[id]/runs/route"
);
const { GET: getRun } = await import(
  "@/app/api/pipelines/[id]/runs/[runId]/route"
);

function json(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const pipelineParams = { params: Promise.resolve({ id: "any" }) };
const runParams = { params: Promise.resolve({ id: "any", runId: "any" }) };

describe("auth: 401 on unauthenticated requests", () => {
  test("GET /api/pipelines", async () => {
    const res = await listPipelines();
    expect(res.status).toBe(401);
  });

  test("POST /api/pipelines", async () => {
    const res = await createPipeline(json({ name: "test" }));
    expect(res.status).toBe(401);
  });

  test("GET /api/pipelines/:id", async () => {
    const res = await getPipeline(new Request("http://localhost"), pipelineParams);
    expect(res.status).toBe(401);
  });

  test("PUT /api/pipelines/:id", async () => {
    const res = await updatePipeline(
      json({ nodes: [], edges: [] }),
      pipelineParams,
    );
    expect(res.status).toBe(401);
  });

  test("DELETE /api/pipelines/:id", async () => {
    const res = await deletePipeline(
      new Request("http://localhost", { method: "DELETE" }),
      pipelineParams,
    );
    expect(res.status).toBe(401);
  });

  test("POST /api/pipelines/:id/runs", async () => {
    const res = await triggerRun(json({}), pipelineParams);
    expect(res.status).toBe(401);
  });

  test("GET /api/pipelines/:id/runs", async () => {
    const res = await listRuns(new Request("http://localhost"), pipelineParams);
    expect(res.status).toBe(401);
  });

  test("GET /api/pipelines/:id/runs/:runId", async () => {
    const res = await getRun(new Request("http://localhost"), runParams);
    expect(res.status).toBe(401);
  });
});
