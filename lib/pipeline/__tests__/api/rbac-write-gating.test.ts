import { describe, expect, test, beforeAll } from "bun:test";
import {
  setupMocks,
  setActiveHeaders,
  createAuthenticatedUser,
  createGuestInOrg,
  type TestContext,
} from "./setup";

const { db: testDb } = await setupMocks();

// --- Route imports ---
const { POST: createPipeline } = await import("@/app/api/pipelines/route");
const {
  PUT: updatePipeline,
  DELETE: deletePipeline,
} = await import("@/app/api/pipelines/[id]/route");
const { POST: createDataset } = await import("@/app/api/datasets/route");
const {
  PUT: updateDataset,
  DELETE: deleteDataset,
} = await import("@/app/api/datasets/[id]/route");

const { pipelines, datasets } = await import("@/lib/db/pipeline-schema");

let owner: TestContext;
let guestHeaders: Headers;
let pipelineId: string;
let datasetId: string;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postJson(body: unknown) {
  return new Request("http://localhost", {
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

beforeAll(async () => {
  owner = await createAuthenticatedUser();
  const guest = await createGuestInOrg(owner.organizationId);
  guestHeaders = guest.headers;

  // Seed a pipeline in the owner's org
  setActiveHeaders(owner.headers);
  const pRes = await createPipeline(postJson({ name: "RBAC Test Pipeline" }));
  const pBody = await pRes.json();
  pipelineId = pBody.id;

  // Seed a dataset in the owner's org
  const dRes = await createDataset(
    postJson({ name: "RBAC Test Dataset", schema: { input: "string" }, items: [] }),
  );
  const dBody = await dRes.json();
  datasetId = dBody.id;
});

// ---------------------------------------------------------------------------
// 4.1 — requireAuth({ write: true })
// ---------------------------------------------------------------------------

describe("requireAuth({ write: true }): guest blocked from mutations", () => {
  test("POST /api/pipelines returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await createPipeline(postJson({ name: "Guest Pipeline" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Insufficient permissions");
  });

  test("POST /api/datasets returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await createDataset(
      postJson({ name: "Guest Dataset", schema: { x: "string" }, items: [] }),
    );
    expect(res.status).toBe(403);
  });

  test("POST /api/pipelines succeeds for member (owner)", async () => {
    setActiveHeaders(owner.headers);
    const res = await createPipeline(postJson({ name: "Owner Pipeline" }));
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// 4.2 — requirePipeline(id, { write: true })
// ---------------------------------------------------------------------------

describe("requirePipeline({ write: true }): guest blocked from pipeline mutations", () => {
  test("PUT /api/pipelines/:id returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await updatePipeline(
      putJson({ nodes: [], edges: [] }),
      makeParams(pipelineId),
    );
    expect(res.status).toBe(403);
  });

  test("DELETE /api/pipelines/:id returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await deletePipeline(
      new Request("http://localhost", { method: "DELETE" }),
      makeParams(pipelineId),
    );
    expect(res.status).toBe(403);
  });

  test("PUT /api/pipelines/:id succeeds for member (owner)", async () => {
    setActiveHeaders(owner.headers);
    const res = await updatePipeline(
      putJson({ nodes: [], edges: [] }),
      makeParams(pipelineId),
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 4.3 — requireDataset(id, { write: true })
// ---------------------------------------------------------------------------

describe("requireDataset({ write: true }): guest blocked from dataset mutations", () => {
  test("PUT /api/datasets/:id returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await updateDataset(
      putJson({ name: "Renamed" }),
      makeParams(datasetId),
    );
    expect(res.status).toBe(403);
  });

  test("DELETE /api/datasets/:id returns 403 for guest", async () => {
    setActiveHeaders(guestHeaders);
    const res = await deleteDataset(
      new Request("http://localhost", { method: "DELETE" }),
      makeParams(datasetId),
    );
    expect(res.status).toBe(403);
  });

  test("PUT /api/datasets/:id succeeds for member (owner)", async () => {
    setActiveHeaders(owner.headers);
    const res = await updateDataset(
      putJson({ name: "Owner Renamed" }),
      makeParams(datasetId),
    );
    expect(res.status).toBe(200);
  });
});
