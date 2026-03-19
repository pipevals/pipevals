import { describe, expect, test, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb } = await setupMocks();

const { POST: createPipeline } = await import("@/app/api/pipelines/route");
const { PUT: updatePipeline } = await import("@/app/api/pipelines/[id]/route");
const { GET: listRuns, POST: triggerRun } = await import(
  "@/app/api/pipelines/[id]/runs/route"
);
const { GET: getMetrics } = await import(
  "@/app/api/pipelines/[id]/runs/metrics/route"
);
const { POST: createDataset } = await import("@/app/api/datasets/route");
const { POST: triggerEvalRun } = await import(
  "@/app/api/pipelines/[id]/eval-runs/route"
);

let ctx: TestContext;
let pipelineId: string;
let evalRunId: string;

function makePipelineParams(id: string) {
  return { params: Promise.resolve({ id }) };
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

describe("pipeline runs evalRunId filter (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);

    // Create pipeline with graph + schema
    const pRes = await createPipeline(
      postJson("/api/pipelines", { name: `Filter Test ${crypto.randomUUID().slice(0, 8)}` }),
    );
    pipelineId = (await pRes.json()).id;

    const n1 = crypto.randomUUID();
    await updatePipeline(
      putJson({
        nodes: [
          { id: n1, type: "api_request", position: { x: 0, y: 0 }, data: { label: "Fetch" } },
        ],
        edges: [],
        triggerSchema: { prompt: "" },
      }),
      makePipelineParams(pipelineId),
    );

    // Trigger an ad-hoc run
    await triggerRun(
      postJson(`/api/pipelines/${pipelineId}/runs`, { prompt: "ad-hoc" }),
      makePipelineParams(pipelineId),
    );

    // Create dataset and trigger eval run (creates 2 pipeline runs)
    const dRes = await createDataset(
      postJson("/api/datasets", {
        name: "Filter Set",
        schema: { prompt: "" },
        items: [{ prompt: "eval-1" }, { prompt: "eval-2" }],
      }),
    );
    const datasetId = (await dRes.json()).id;

    const erRes = await triggerEvalRun(
      postJson(`/api/pipelines/${pipelineId}/eval-runs`, { datasetId }),
      makePipelineParams(pipelineId),
    );
    evalRunId = (await erRes.json()).evalRunId;
  });

  describe("GET /api/pipelines/:id/runs", () => {
    test("without evalRunId returns only ad-hoc runs", async () => {
      const res = await listRuns(
        new Request(`http://localhost/api/pipelines/${pipelineId}/runs`),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // Should only include the 1 ad-hoc run, not the 2 eval runs
      expect(data).toHaveLength(1);
      expect(data[0].triggerPayload?.prompt).toBe("ad-hoc");
    });

    test("with evalRunId returns only runs for that eval run", async () => {
      const res = await listRuns(
        new Request(
          `http://localhost/api/pipelines/${pipelineId}/runs?evalRunId=${evalRunId}`,
        ),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      const prompts = data.map((r: any) => r.triggerPayload?.prompt).sort();
      expect(prompts).toEqual(["eval-1", "eval-2"]);
    });
  });

  describe("GET /api/pipelines/:id/runs/metrics", () => {
    test("without evalRunId returns all runs", async () => {
      const res = await getMetrics(
        new Request(`http://localhost/api/pipelines/${pipelineId}/runs/metrics`),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // All 3 runs (1 ad-hoc + 2 eval)
      expect(data.runs).toHaveLength(3);
    });

    test("with evalRunId scopes to eval run only", async () => {
      const res = await getMetrics(
        new Request(
          `http://localhost/api/pipelines/${pipelineId}/runs/metrics?evalRunId=${evalRunId}`,
        ),
        makePipelineParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.runs).toHaveLength(2);
    });
  });
});
