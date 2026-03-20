import { describe, expect, test, mock, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb } = await setupMocks();

const { GET: listPipelines, POST: createPipeline } = await import(
  "@/app/api/pipelines/route"
);
const {
  GET: getPipeline,
  PUT: updatePipeline,
  DELETE: deletePipeline,
} = await import("@/app/api/pipelines/[id]/route");
const { pipelines, pipelineNodes, pipelineEdges, pipelineTemplates } = await import(
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
  const resolvedName = name ?? `pipeline-${id.slice(0, 8)}`;
  await testDb.insert(pipelines).values({
    id,
    name: resolvedName,
    slug: resolvedName.toLowerCase().replace(/\s+/g, "-"),
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
    setActiveHeaders(ctx.headers);
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

  describe("GET /api/pipelines/:id — triggerSchema", () => {
    test("returns triggerSchema defaulting to {}", async () => {
      const pipelineId = await seedPipeline();

      const res = await getPipeline(
        new Request("http://localhost"),
        makeParams(pipelineId),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.triggerSchema).toEqual({});
    });
  });

  describe("PUT /api/pipelines/:id — triggerSchema", () => {
    test("persists triggerSchema object when provided", async () => {
      const pipelineId = await seedPipeline();
      const schema = { prompt: "", temperature: 0 };

      await updatePipeline(
        putJson({ nodes: [], edges: [], triggerSchema: schema }),
        makeParams(pipelineId),
      );

      const res = await getPipeline(new Request("http://localhost"), makeParams(pipelineId));
      const data = await res.json();
      expect(data.triggerSchema).toEqual(schema);
    });

    test("rejects array triggerSchema", async () => {
      const pipelineId = await seedPipeline();

      const res = await updatePipeline(
        putJson({ nodes: [], edges: [], triggerSchema: [{ name: "prompt" }] }),
        makeParams(pipelineId),
      );
      expect(res.status).toBe(400);
    });

    test("omitting triggerSchema preserves existing schema", async () => {
      const pipelineId = await seedPipeline();
      const schema = { input: "" };

      await updatePipeline(
        putJson({ nodes: [], edges: [], triggerSchema: schema }),
        makeParams(pipelineId),
      );

      // PUT again without triggerSchema
      await updatePipeline(
        putJson({ name: "Renamed", nodes: [], edges: [] }),
        makeParams(pipelineId),
      );

      const res = await getPipeline(new Request("http://localhost"), makeParams(pipelineId));
      const data = await res.json();
      expect(data.triggerSchema).toEqual(schema);
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

    test("400 on duplicate node slugs", async () => {
      const pipelineId = await seedPipeline();
      const body = {
        nodes: [
          { id: crypto.randomUUID(), type: "ai_sdk", position: { x: 0, y: 0 }, data: { label: "A", slug: "generator" } },
          { id: crypto.randomUUID(), type: "ai_sdk", position: { x: 200, y: 0 }, data: { label: "B", slug: "generator" } },
        ],
        edges: [],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid node slugs");
      expect(data.details[0]).toContain("generator");
    });

    test("400 on invalid slug format", async () => {
      const pipelineId = await seedPipeline();
      const body = {
        nodes: [
          { id: crypto.randomUUID(), type: "ai_sdk", position: { x: 0, y: 0 }, data: { label: "A", slug: "Model A" } },
        ],
        edges: [],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid node slugs");
    });

    test("200 with null slugs", async () => {
      const pipelineId = await seedPipeline();
      const body = {
        nodes: [
          { id: crypto.randomUUID(), type: "trigger", position: { x: 0, y: 0 }, data: { label: "Trigger", slug: null } },
          { id: crypto.randomUUID(), type: "ai_sdk", position: { x: 200, y: 0 }, data: { label: "Gen", slug: null } },
        ],
        edges: [],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(200);
    });

    test("200 with valid unique slugs and persists them", async () => {
      const pipelineId = await seedPipeline();
      const n1 = crypto.randomUUID();
      const body = {
        nodes: [
          { id: n1, type: "ai_sdk", position: { x: 0, y: 0 }, data: { label: "Generator", slug: "generator" } },
          { id: crypto.randomUUID(), type: "metric_capture", position: { x: 200, y: 0 }, data: { label: "Metrics", slug: "metrics" } },
        ],
        edges: [],
      };

      const res = await updatePipeline(putJson(body), makeParams(pipelineId));
      expect(res.status).toBe(200);

      // Verify slug is returned in GET
      const getRes = await getPipeline(new Request("http://localhost"), makeParams(pipelineId));
      const data = await getRes.json();
      const gen = data.nodes.find((n: any) => n.id === n1);
      expect(gen.data.slug).toBe("generator");
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

  describe("POST /api/pipelines with templateId", () => {
    const templateSnapshot = {
      nodes: [
        { id: "tmpl-n1", type: "trigger", label: "Trigger", config: {}, positionX: 0, positionY: 0 },
        { id: "tmpl-n2", type: "ai_sdk", label: "Gen", config: { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "trigger.prompt" }, positionX: 300, positionY: 0 },
      ],
      edges: [
        { id: "tmpl-e1", sourceNodeId: "tmpl-n1", sourceHandle: null, targetNodeId: "tmpl-n2", targetHandle: null },
      ],
    };

    async function seedTemplate(opts?: { orgId?: string | null }) {
      const id = crypto.randomUUID();
      await testDb.insert(pipelineTemplates).values({
        id,
        name: `Template ${id.slice(0, 8)}`,
        slug: `tmpl-${id.slice(0, 8)}`,
        graphSnapshot: templateSnapshot,
        triggerSchema: { prompt: "" },
        organizationId: opts?.orgId === undefined ? null : opts.orgId,
        createdBy: null,
      });
      return id;
    }

    test("201 creates pipeline pre-populated from template", async () => {
      const templateId = await seedTemplate();
      const res = await createPipeline(
        postJson({ name: `From Tmpl ${crypto.randomUUID().slice(0, 8)}`, templateId }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();

      // Fetch the pipeline with graph to verify nodes/edges were cloned
      const getRes = await getPipeline(
        new Request("http://localhost"),
        makeParams(data.id),
      );
      const pipeline = await getRes.json();
      expect(pipeline.nodes.length).toBe(2);
      expect(pipeline.edges.length).toBe(1);
      expect(pipeline.triggerSchema).toEqual({ prompt: "" });
    });

    test("fresh UUIDs — no collision between two pipelines from same template", async () => {
      const templateId = await seedTemplate();
      const res1 = await createPipeline(
        postJson({ name: `Clone A ${crypto.randomUUID().slice(0, 8)}`, templateId }),
      );
      const res2 = await createPipeline(
        postJson({ name: `Clone B ${crypto.randomUUID().slice(0, 8)}`, templateId }),
      );
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      const p1 = await (await getPipeline(new Request("http://localhost"), makeParams((await res1.clone().json()).id))).json();
      const p2 = await (await getPipeline(new Request("http://localhost"), makeParams((await res2.clone().json()).id))).json();

      const nodeIds1 = p1.nodes.map((n: any) => n.id);
      const nodeIds2 = p2.nodes.map((n: any) => n.id);

      // No overlapping node IDs
      for (const id of nodeIds1) {
        expect(nodeIds2).not.toContain(id);
      }

      // None match the original template IDs
      for (const id of nodeIds1) {
        expect(id).not.toBe("tmpl-n1");
        expect(id).not.toBe("tmpl-n2");
      }
    });

    test("404 on invalid templateId", async () => {
      const res = await createPipeline(
        postJson({ name: "Bad Template", templateId: "nonexistent" }),
      );
      expect(res.status).toBe(404);
    });

    test("404 on template from another org", async () => {
      // Create a second org via test helpers so the FK is satisfied
      const otherCtx = await createAuthenticatedUser();
      const otherOrgTemplateId = await seedTemplate({ orgId: otherCtx.organizationId });

      // Switch back to original user's headers
      setActiveHeaders(ctx.headers);

      const res = await createPipeline(
        postJson({ name: "Other Org Template", templateId: otherOrgTemplateId }),
      );
      expect(res.status).toBe(404);
    });
  });
});
