/**
 * API Smoke Tests (PGlite — no dev server needed)
 *
 * Tests the same flows as the E2E browser tests but via direct route
 * handler calls against an in-memory database. Seeds pipelines, then
 * exercises list / get / run-trigger flows.
 *
 * Run:
 *   bun test tests/api/smoke.test.ts
 */

import { describe, expect, test, mock, beforeAll } from "bun:test";
import {
  setupMocks,
  setActiveHeaders,
  createAuthenticatedUser,
  type TestContext,
} from "../../lib/pipeline/__tests__/api/setup";
import {
  seedPipelines,
  seedPipelineDefinitions,
} from "../../lib/db/seed-templates";

// -- Bootstrap test DB and mocks --

const { db: testDb } = await setupMocks();

// -- Import route handlers AFTER mocks --

const { GET: listPipelines } = await import(
  "@/app/api/pipelines/route"
);
const { GET: getPipeline } = await import(
  "@/app/api/pipelines/[id]/route"
);
const { POST: triggerRun, GET: listRuns } = await import(
  "@/app/api/pipelines/[id]/runs/route"
);

// -- Helpers --

const JUDGE = seedPipelineDefinitions.find(
  (d) => d.slug === "ai-as-a-judge-scoring",
)!;
const AB = seedPipelineDefinitions.find(
  (d) => d.slug === "model-ab-comparison",
)!;

let ctx: TestContext;

function pipelineParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function runsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function findPipelineId(name: string): Promise<string> {
  const res = await listPipelines();
  const data = await res.json();
  const pipeline = data.find((p: { name: string }) => p.name === name);
  return pipeline.id;
}

// -- Tests --

describe("API smoke tests (PGlite)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
    await seedPipelines(testDb as any, ctx.organizationId, ctx.userId);
  });

  describe("Pipeline list", () => {
    test("GET /api/pipelines returns both seed pipelines", async () => {
      const res = await listPipelines();
      expect(res.status).toBe(200);

      const data = await res.json();
      const names = data.map((p: { name: string }) => p.name);
      expect(names).toContain(JUDGE.name);
      expect(names).toContain(AB.name);
    });
  });

  describe("AI-as-a-Judge pipeline", () => {
    let pipelineId: string;

    beforeAll(async () => {
      pipelineId = await findPipelineId(JUDGE.name);
    });

    test("GET returns 4 nodes and 3 edges", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.nodes).toHaveLength(4);
      expect(data.edges).toHaveLength(3);
    });

    test("node labels are Trigger, Generator, Judge, Metrics", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const labels = data.nodes.map(
        (n: { data: { label: string } }) => n.data.label,
      );
      expect(labels).toContain("Trigger");
      expect(labels).toContain("Generator");
      expect(labels).toContain("Judge");
      expect(labels).toContain("Metrics");
    });

    test("trigger schema has prompt field", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      expect(data.triggerSchema).toEqual({ prompt: "" });
    });

    test("Judge node has responseFormat with score and reasoning", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const judge = data.nodes.find(
        (n: { data: { label: string } }) => n.data.label === "Judge",
      );
      const rf = judge.data.config.responseFormat;
      expect(rf.properties.score).toBeDefined();
      expect(rf.properties.reasoning).toBeDefined();
    });

    test("POST /runs triggers a run", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Explain what makes a good API" }),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(202);

      const data = await res.json();
      expect(data.runId).toBeDefined();
    });

    test("POST /runs rejects payload with wrong type", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: 123 }),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test("POST /runs rejects payload missing required field", async () => {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await triggerRun(req, runsParams(pipelineId));
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test("GET /runs returns the triggered run", async () => {
      const res = await listRuns(
        new Request("http://localhost"),
        runsParams(pipelineId),
      );
      expect(res.status).toBe(200);

      const { data } = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(["pending", "running", "completed", "failed"]).toContain(
        data[0].status,
      );
    });
  });

  describe("Model A/B Comparison pipeline", () => {
    let pipelineId: string;

    beforeAll(async () => {
      pipelineId = await findPipelineId(AB.name);
    });

    test("GET returns 6 nodes and 6 edges", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.nodes).toHaveLength(6);
      expect(data.edges).toHaveLength(6);
    });

    test("node labels are correct", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const labels = data.nodes.map(
        (n: { data: { label: string } }) => n.data.label,
      );
      expect(labels).toContain("Trigger");
      expect(labels).toContain("Model A");
      expect(labels).toContain("Model B");
      expect(labels).toContain("Collect Responses");
      expect(labels).toContain("Judge");
      expect(labels).toContain("Metrics");
    });

    test("Model A and Model B use different models", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const modelA = data.nodes.find(
        (n: { data: { label: string } }) => n.data.label === "Model A",
      );
      const modelB = data.nodes.find(
        (n: { data: { label: string } }) => n.data.label === "Model B",
      );
      expect(modelA.data.config.model).not.toBe(modelB.data.config.model);
    });

    test("trigger fans out to both models", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const trigger = data.nodes.find(
        (n: { data: { label: string } }) => n.data.label === "Trigger",
      );
      const edgesFromTrigger = data.edges.filter(
        (e: { source: string }) => e.source === trigger.id,
      );
      expect(edgesFromTrigger).toHaveLength(2);
    });

    test("Collect Responses maps both model outputs", async () => {
      const res = await getPipeline(
        new Request("http://localhost"),
        pipelineParams(pipelineId),
      );
      const data = await res.json();

      const collect = data.nodes.find(
        (n: { data: { label: string } }) =>
          n.data.label === "Collect Responses",
      );
      expect(collect.data.config.mapping).toEqual({
        response_a: "steps.model_a.text",
        response_b: "steps.model_b.text",
      });
    });
  });
});
