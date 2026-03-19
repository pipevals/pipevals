import { describe, expect, test, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb, mockResumeHook } = await setupMocks();

const { POST: submitReview } = await import("@/app/api/tasks/[id]/submit/route");
const { pipelines, pipelineRuns, tasks } = await import("@/lib/db/pipeline-schema");

let ctx: TestContext;

async function seedTask(opts: { status?: "pending" | "completed" } = {}) {
  const pipelineId = crypto.randomUUID();
  await testDb.insert(pipelines).values({
    id: pipelineId,
    name: "Test Pipeline",
    slug: `test-${pipelineId.slice(0, 8)}`,
    organizationId: ctx.organizationId,
    createdBy: ctx.userId,
  });

  const runId = crypto.randomUUID();
  await testDb.insert(pipelineRuns).values({
    id: runId,
    pipelineId,
    status: "awaiting_review",
    graphSnapshot: { nodes: [], edges: [] },
  });

  const taskId = crypto.randomUUID();
  await testDb.insert(tasks).values({
    id: taskId,
    pipelineId,
    runId,
    nodeId: "node-review-1",
    hookToken: `review:${runId}:node-review-1:0`,
    status: opts.status ?? "pending",
    rubric: [
      { name: "accuracy", type: "rating", min: 1, max: 5 },
      { name: "notes", type: "text" },
    ],
    displayData: { "AI Response": "Test output" },
    reviewerIndex: 0,
  });

  return { pipelineId, runId, taskId };
}

function submitParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/tasks/:id/submit", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  test("200 on valid submission", async () => {
    const { taskId } = await seedTask();

    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accuracy: 4, notes: "Good output" }),
    });

    const res = await submitReview(req, submitParams(taskId));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("completed");
    expect(data.reviewedBy).toBe(ctx.userId);
    expect(mockResumeHook).toHaveBeenCalled();
  });

  test("409 on duplicate submission", async () => {
    const { taskId } = await seedTask({ status: "completed" });

    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accuracy: 4, notes: "Again" }),
    });

    const res = await submitReview(req, submitParams(taskId));
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data.error).toContain("already completed");
  });

  test("400 on missing required field", async () => {
    const { taskId } = await seedTask();

    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accuracy: 4 }), // notes missing
    });

    const res = await submitReview(req, submitParams(taskId));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Validation failed");
    expect(data.details[0].field).toBe("notes");
  });

  test("400 on out-of-range rating", async () => {
    const { taskId } = await seedTask();

    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accuracy: 10, notes: "Way too high" }),
    });

    const res = await submitReview(req, submitParams(taskId));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.details[0].field).toBe("accuracy");
    expect(data.details[0].message).toContain("between 1 and 5");
  });

  test("404 on nonexistent task", async () => {
    const req = new Request("http://localhost/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accuracy: 4, notes: "x" }),
    });

    const res = await submitReview(req, submitParams(crypto.randomUUID()));
    expect(res.status).toBe(404);
  });
});
