import { describe, expect, test, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb } = await setupMocks();

const { POST: createPipeline } = await import("@/app/api/pipelines/route");
const { PUT: updatePipeline } = await import("@/app/api/pipelines/[id]/route");
const { POST: createDataset } = await import("@/app/api/datasets/route");
const { POST: triggerEvalRun, GET: listEvalRuns } = await import(
  "@/app/api/pipelines/[id]/eval-runs/route"
);
const { GET: getEvalRun } = await import(
  "@/app/api/pipelines/[id]/eval-runs/[evalRunId]/route"
);
const { GET: getEvalRunMetrics } = await import(
  "@/app/api/pipelines/[id]/eval-runs/[evalRunId]/metrics/route"
);

let ctx: TestContext;
let pipelineId: string;
let datasetId: string;

function makePipelineParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeEvalRunParams(id: string, evalRunId: string) {
  return { params: Promise.resolve({ id, evalRunId }) };
}

function postJson(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
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

describe("eval run API (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);

    // Create a pipeline with a graph and triggerSchema
    const pRes = await createPipeline(
      postJson("/api/pipelines", { name: `Eval Pipeline ${crypto.randomUUID().slice(0, 8)}` }),
    );
    const pData = await pRes.json();
    pipelineId = pData.id;

    const n1 = crypto.randomUUID();
    const n2 = crypto.randomUUID();
    await updatePipeline(
      putJson({
        nodes: [
          { id: n1, type: "api_request", position: { x: 0, y: 0 }, data: { label: "Fetch" } },
          { id: n2, type: "transform", position: { x: 200, y: 0 }, data: { label: "Map" } },
        ],
        edges: [{ id: crypto.randomUUID(), source: n1, target: n2 }],
        triggerSchema: { prompt: "", expected: "" },
      }),
      makePipelineParams(pipelineId),
    );

    // Create a compatible dataset
    const dRes = await createDataset(
      postJson("/api/datasets", {
        name: "Eval Test Set",
        schema: { prompt: "", expected: "" },
        items: [
          { prompt: "hello", expected: "Hi" },
          { prompt: "bye", expected: "Goodbye" },
          { prompt: "thanks", expected: "You're welcome" },
        ],
      }),
    );
    const dData = await dRes.json();
    datasetId = dData.id;
  });

  describe("POST /api/pipelines/:id/eval-runs", () => {
    test("202 triggers eval run and creates pipeline runs", async () => {
      const res = await triggerEvalRun(
        postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId }),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(202);
      const data = await res.json();
      expect(data.evalRunId).toBeDefined();

      // Verify the eval run was created with child runs
      const detailRes = await getEvalRun(
        new Request("http://localhost"),
        makeEvalRunParams(pipelineId, data.evalRunId),
      );
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.totalItems).toBe(3);
      expect(detail.runs).toHaveLength(3);
      // Each run should have the correct trigger payload
      const payloads = detail.runs.map((r: any) => r.triggerPayload?.prompt).sort();
      expect(payloads).toEqual(["bye", "hello", "thanks"]);
    });

    test("400 on schema mismatch", async () => {
      // Create a dataset with different schema
      const dRes = await createDataset(
        postJson("/api/datasets", {
          name: "Mismatched",
          schema: { input: "" },
          items: [{ input: "test" }],
        }),
      );
      const { id: badDatasetId } = await dRes.json();

      const res = await triggerEvalRun(
        postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId: badDatasetId }),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Schema mismatch");
    });

    test("400 on empty dataset", async () => {
      const dRes = await createDataset(
        postJson("/api/datasets", {
          name: "Empty",
          schema: { prompt: "", expected: "" },
        }),
      );
      const { id: emptyDatasetId } = await dRes.json();

      const res = await triggerEvalRun(
        postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId: emptyDatasetId }),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("no items");
    });

    test("404 on nonexistent dataset", async () => {
      const res = await triggerEvalRun(
        postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId: "nonexistent" }),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/pipelines/:id/eval-runs", () => {
    test("200 lists eval runs", async () => {
      const res = await listEvalRuns(
        new Request("http://localhost"),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const { data, totalCount } = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(totalCount).toBeGreaterThanOrEqual(1);
      expect(data[0].totalItems).toBeDefined();
      expect(data[0].datasetId).toBe(datasetId);
    });
  });

  describe("GET /api/pipelines/:id/eval-runs/:evalRunId", () => {
    test("404 on nonexistent eval run", async () => {
      const res = await getEvalRun(
        new Request("http://localhost"),
        makeEvalRunParams(pipelineId, "nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/pipelines/:id/eval-runs/:evalRunId/metrics", () => {
    test("200 returns metrics with aggregate", async () => {
      // Trigger a fresh eval run to get its ID
      const trigRes = await triggerEvalRun(
        postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId }),
        makePipelineParams(pipelineId),
      );
      const { evalRunId } = await trigRes.json();

      const res = await getEvalRunMetrics(
        new Request("http://localhost"),
        makeEvalRunParams(pipelineId, evalRunId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.runs).toBeDefined();
      expect(data.aggregate).toBeDefined();
    });

    test("404 on nonexistent eval run", async () => {
      const res = await getEvalRunMetrics(
        new Request("http://localhost"),
        makeEvalRunParams(pipelineId, "nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });
});
