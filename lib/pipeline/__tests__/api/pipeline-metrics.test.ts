import { describe, expect, test, beforeAll } from "bun:test";
import {
  setupMocks,
  setActiveHeaders,
  createAuthenticatedUser,
  type TestContext,
} from "./setup";

const { db: testDb } = await setupMocks();

const { GET: getMetrics } = await import(
  "@/app/api/pipelines/[id]/runs/metrics/route"
);
const { pipelines, pipelineNodes, pipelineRuns, stepResults } = await import(
  "@/lib/db/pipeline-schema"
);

let ctx: TestContext;

function metricsParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedPipeline() {
  const pipelineId = crypto.randomUUID();
  const name = `pipeline-${pipelineId.slice(0, 8)}`;
  await testDb.insert(pipelines).values({
    id: pipelineId,
    name,
    slug: name,
    organizationId: ctx.organizationId,
    createdBy: ctx.userId,
  });
  return pipelineId;
}

async function seedCompletedRun(
  pipelineId: string,
  opts: {
    nodes: { id: string; type: string; label: string }[];
    stepOutputs: {
      nodeId: string;
      status?: string;
      output?: Record<string, unknown>;
      durationMs?: number;
    }[];
    startedAt?: Date;
    completedAt?: Date;
  },
) {
  const runId = crypto.randomUUID();
  const graphSnapshot = {
    nodes: opts.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: {},
      positionX: 0,
      positionY: 0,
    })),
    edges: [],
  };

  await testDb.insert(pipelineRuns).values({
    id: runId,
    pipelineId,
    status: "completed",
    triggerPayload: {},
    graphSnapshot,
    startedAt: opts.startedAt ?? new Date("2026-03-18T10:00:00Z"),
    completedAt: opts.completedAt ?? new Date("2026-03-18T10:00:05Z"),
  });

  for (const step of opts.stepOutputs) {
    await testDb.insert(stepResults).values({
      runId,
      nodeId: step.nodeId,
      status: (step.status as "completed") ?? "completed",
      output: step.output ?? null,
      durationMs: step.durationMs ?? null,
    });
  }

  return runId;
}

describe("GET /api/pipelines/:id/runs/metrics", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  test("401 on unauthenticated request", async () => {
    setActiveHeaders(new Headers());
    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams("any"),
    );
    expect(res.status).toBe(401);
    setActiveHeaders(ctx.headers);
  });

  test("404 on nonexistent pipeline", async () => {
    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  test("200 with empty runs array for pipeline with no runs", async () => {
    const pipelineId = await seedPipeline();
    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toEqual([]);
  });

  test("returns metrics from metric_capture step output", async () => {
    const pipelineId = await seedPipeline();
    const generatorId = crypto.randomUUID();
    const metricId = crypto.randomUUID();

    await seedCompletedRun(pipelineId, {
      nodes: [
        { id: generatorId, type: "ai_sdk", label: "Generator" },
        { id: metricId, type: "metric_capture", label: "Metrics" },
      ],
      stepOutputs: [
        {
          nodeId: generatorId,
          output: { text: "hello" },
          durationMs: 2300,
        },
        {
          nodeId: metricId,
          output: { metrics: { relevance: 0.87, coherence: 0.92 } },
          durationMs: 50,
        },
      ],
    });

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0].metrics).toEqual({
      relevance: 0.87,
      coherence: 0.92,
    });
  });

  test("merges metrics from multiple metric_capture nodes", async () => {
    const pipelineId = await seedPipeline();
    const mc1 = crypto.randomUUID();
    const mc2 = crypto.randomUUID();

    await seedCompletedRun(pipelineId, {
      nodes: [
        { id: mc1, type: "metric_capture", label: "Metrics A" },
        { id: mc2, type: "metric_capture", label: "Metrics B" },
      ],
      stepOutputs: [
        {
          nodeId: mc1,
          output: { metrics: { score: 8 } },
          durationMs: 10,
        },
        {
          nodeId: mc2,
          output: { metrics: { latency: 1200 } },
          durationMs: 10,
        },
      ],
    });

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    const data = await res.json();
    expect(data.runs[0].metrics).toEqual({ score: 8, latency: 1200 });
  });

  test("includes step durations with labels", async () => {
    const pipelineId = await seedPipeline();
    const genId = crypto.randomUUID();
    const judgeId = crypto.randomUUID();

    await seedCompletedRun(pipelineId, {
      nodes: [
        { id: genId, type: "ai_sdk", label: "Generator" },
        { id: judgeId, type: "ai_sdk", label: "Judge" },
      ],
      stepOutputs: [
        { nodeId: genId, output: { text: "hi" }, durationMs: 2300 },
        { nodeId: judgeId, output: { text: "ok" }, durationMs: 1800 },
      ],
    });

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    const data = await res.json();
    const steps = data.runs[0].steps;
    expect(steps).toHaveLength(2);

    const gen = steps.find((s: { label: string }) => s.label === "Generator");
    const judge = steps.find((s: { label: string }) => s.label === "Judge");
    expect(gen.durationMs).toBe(2300);
    expect(judge.durationMs).toBe(1800);
  });

  test("computes run durationMs from timestamps", async () => {
    const pipelineId = await seedPipeline();
    const nodeId = crypto.randomUUID();

    await seedCompletedRun(pipelineId, {
      nodes: [{ id: nodeId, type: "transform", label: "T" }],
      stepOutputs: [{ nodeId, output: {}, durationMs: 100 }],
      startedAt: new Date("2026-03-18T10:00:00Z"),
      completedAt: new Date("2026-03-18T10:00:05Z"),
    });

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    const data = await res.json();
    expect(data.runs[0].durationMs).toBe(5000);
  });

  test("returns runs ordered by createdAt ascending", async () => {
    const pipelineId = await seedPipeline();
    const nodeId = crypto.randomUUID();

    // Seed runs with explicit timestamps to ensure ordering
    for (let i = 0; i < 3; i++) {
      const runId = crypto.randomUUID();
      await testDb.insert(pipelineRuns).values({
        id: runId,
        pipelineId,
        status: "completed",
        triggerPayload: {},
        graphSnapshot: {
          nodes: [
            { id: nodeId, type: "transform", label: "T", config: {}, positionX: 0, positionY: 0 },
          ],
          edges: [],
        },
        startedAt: new Date(`2026-03-1${i + 1}T10:00:00Z`),
        completedAt: new Date(`2026-03-1${i + 1}T10:00:01Z`),
      });
    }

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    const data = await res.json();
    expect(data.runs.length).toBeGreaterThanOrEqual(3);

    const dates = data.runs.map(
      (r: { createdAt: string }) => new Date(r.createdAt).getTime(),
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  test("returns empty metrics object when run has no metric_capture nodes", async () => {
    const pipelineId = await seedPipeline();
    const nodeId = crypto.randomUUID();

    await seedCompletedRun(pipelineId, {
      nodes: [{ id: nodeId, type: "ai_sdk", label: "Model" }],
      stepOutputs: [{ nodeId, output: { text: "result" }, durationMs: 500 }],
    });

    const res = await getMetrics(
      new Request("http://localhost"),
      metricsParams(pipelineId),
    );
    const data = await res.json();
    expect(data.runs[0].metrics).toEqual({});
  });
});
