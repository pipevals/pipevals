import { describe, expect, test, mock, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb, mockWorkflowStart } = await setupMocks();

const { POST: triggerRun, GET: listRuns } = await import(
  "@/app/api/pipelines/[id]/runs/route"
);
const { GET: getRun } = await import(
  "@/app/api/pipelines/[id]/runs/[runId]/route"
);
const {
  pipelines,
  pipelineNodes,
  pipelineEdges,
  stepResults,
} = await import("@/lib/db/pipeline-schema");

let ctx: TestContext;

async function seedPipeline(opts: { nodes?: boolean } = {}) {
  const pipelineId = crypto.randomUUID();
  const name = `pipeline-${pipelineId.slice(0, 8)}`;
  await testDb.insert(pipelines).values({
    id: pipelineId,
    name,
    slug: name,
    organizationId: ctx.organizationId,
    createdBy: ctx.userId,
  });

  if (opts.nodes !== false) {
    const n1 = crypto.randomUUID();
    const n2 = crypto.randomUUID();
    await testDb.insert(pipelineNodes).values([
      { id: n1, pipelineId, type: "api_request", label: "Fetch", config: { url: "https://example.com", method: "GET" } },
      { id: n2, pipelineId, type: "transform", label: "Map", config: { mapping: {} } },
    ]);
    await testDb.insert(pipelineEdges).values({
      id: crypto.randomUUID(),
      pipelineId,
      sourceNodeId: n1,
      targetNodeId: n2,
    });
  }

  return pipelineId;
}

function runsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}
function runDetailParams(id: string, runId: string) {
  return { params: Promise.resolve({ id, runId }) };
}

describe("run endpoints (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  describe("POST /api/pipelines/:id/runs", () => {
    test("202 on trigger with payload", async () => {
      const pipelineId = await seedPipeline();

      const req = new Request("http://localhost/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "explain quantum computing" }),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(202);

      const data = await res.json();
      expect(data.runId).toBeDefined();
      expect(mockWorkflowStart).toHaveBeenCalled();
    });

    test("graph snapshot excludes trigger node and its edges", async () => {
      const pipelineId = await seedPipeline({ nodes: false });
      const triggerNodeId = "trigger-source";
      const stepNodeId = crypto.randomUUID();

      await testDb.insert(pipelineNodes).values([
        { id: triggerNodeId, pipelineId, type: "trigger", label: "Trigger", config: {} },
        { id: stepNodeId, pipelineId, type: "ai_sdk", label: "Model", config: { model: "openai/gpt-4o", promptTemplate: "trigger.prompt" } },
      ]);
      await testDb.insert(pipelineEdges).values({
        id: crypto.randomUUID(),
        pipelineId,
        sourceNodeId: triggerNodeId,
        targetNodeId: stepNodeId,
      });

      const req = new Request("http://localhost/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hello" }),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(202);

      const { runId } = await res.json();
      const runRes = await getRun(new Request("http://localhost"), runDetailParams(pipelineId, runId));
      const run = await runRes.json();

      const snapshotNodeIds = run.graphSnapshot.nodes.map((n: { id: string }) => n.id);
      expect(snapshotNodeIds).not.toContain(triggerNodeId);
      expect(snapshotNodeIds).toContain(stepNodeId);
      expect(run.graphSnapshot.edges).toHaveLength(0);
    });

    test("400 on trigger empty pipeline", async () => {
      const pipelineId = await seedPipeline({ nodes: false });

      const req = new Request("http://localhost/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("no nodes");
    });

    test("404 on nonexistent pipeline", async () => {
      const req = new Request("http://localhost/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await triggerRun(req, runsParams("nonexistent-id"));
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/pipelines/:id/runs", () => {
    test("200 on list runs ordered by recent", async () => {
      const pipelineId = await seedPipeline();

      for (let i = 0; i < 2; i++) {
        const req = new Request("http://localhost/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ i }),
        });
        await triggerRun(req, runsParams(pipelineId));
      }

      const res = await listRuns(
        new Request("http://localhost/runs"),
        runsParams(pipelineId),
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(2);

      const dates = data.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  describe("GET /api/pipelines/:pipelineId/runs/:runId", () => {
    test("200 on get run status with step_results", async () => {
      const pipelineId = await seedPipeline();

      const triggerReq = new Request("http://localhost/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "test" }),
      });
      const triggerRes = await triggerRun(triggerReq, runsParams(pipelineId));
      const { runId } = await triggerRes.json();

      await testDb.insert(stepResults).values({
        runId,
        nodeId: "some-node",
        status: "completed",
        output: { text: "result" },
        durationMs: 42,
      });

      const res = await getRun(
        new Request("http://localhost"),
        runDetailParams(pipelineId, runId),
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(runId);
      expect(data.status).toBe("pending");
      expect(data.stepResults).toHaveLength(1);
      expect(data.stepResults[0].nodeId).toBe("some-node");
      expect(data.stepResults[0].output).toEqual({ text: "result" });
    });

    test("404 on nonexistent run", async () => {
      const pipelineId = await seedPipeline();

      const res = await getRun(
        new Request("http://localhost"),
        runDetailParams(pipelineId, "nonexistent-run"),
      );
      expect(res.status).toBe(404);
    });
  });
});
