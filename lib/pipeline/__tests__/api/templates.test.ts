import { describe, expect, test, beforeAll } from "bun:test";
import {
  setupMocks,
  setActiveHeaders,
  createAuthenticatedUser,
  type TestContext,
} from "./setup";

const { db: testDb } = await setupMocks();

const { GET: listTemplates, POST: createTemplate } = await import(
  "@/app/api/templates/route"
);
const { DELETE: deleteTemplate } = await import(
  "@/app/api/templates/[id]/route"
);
const { pipelineTemplates } = await import("@/lib/db/pipeline-schema");

let ctx: TestContext;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postJson(body: unknown) {
  return new Request("http://localhost/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleSnapshot = {
  nodes: [
    { id: "n1", type: "trigger", label: "Trigger", config: {}, positionX: 0, positionY: 0 },
    { id: "n2", type: "ai_sdk", label: "Gen", config: { type: "ai_sdk", model: "openai/gpt-4o", promptTemplate: "trigger.prompt" }, positionX: 300, positionY: 0 },
  ],
  edges: [
    { id: "e1", sourceNodeId: "n1", sourceHandle: null, targetNodeId: "n2", targetHandle: null },
  ],
};

async function seedBuiltInTemplate(slug: string) {
  const id = crypto.randomUUID();
  await testDb.insert(pipelineTemplates).values({
    id,
    name: `Built-in ${slug}`,
    slug,
    description: "A built-in template",
    graphSnapshot: sampleSnapshot,
    triggerSchema: { prompt: "" },
    organizationId: null,
    createdBy: null,
  });
  return id;
}

describe("templates API (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  describe("GET /api/templates", () => {
    test("returns built-in and org-scoped templates", async () => {
      const builtInId = await seedBuiltInTemplate(`builtin-${crypto.randomUUID().slice(0, 8)}`);

      // Create an org-scoped template
      const orgId = crypto.randomUUID();
      await testDb.insert(pipelineTemplates).values({
        id: orgId,
        name: "Org Template",
        slug: `org-tmpl-${crypto.randomUUID().slice(0, 8)}`,
        graphSnapshot: sampleSnapshot,
        triggerSchema: {},
        organizationId: ctx.organizationId,
        createdBy: ctx.userId,
      });

      const res = await listTemplates(new Request("http://localhost/api/templates"));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);

      const ids = data.map((t: any) => t.id);
      expect(ids).toContain(builtInId);
      expect(ids).toContain(orgId);

      // graphSnapshot should NOT be in list response
      for (const t of data) {
        expect(t).not.toHaveProperty("graphSnapshot");
      }
    });
  });

  describe("POST /api/templates", () => {
    test("201 on create", async () => {
      const res = await createTemplate(
        postJson({
          name: "My Eval Template",
          description: "A test template",
          graphSnapshot: sampleSnapshot,
          triggerSchema: { prompt: "" },
        }),
      );
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.slug).toBe("my-eval-template");
      expect(data.organizationId).toBe(ctx.organizationId);
      expect(data.createdBy).toBe(ctx.userId);
    });

    test("409 on duplicate slug in same org", async () => {
      const name = `Dup-${crypto.randomUUID().slice(0, 8)}`;
      const first = await createTemplate(
        postJson({ name, graphSnapshot: sampleSnapshot, triggerSchema: {} }),
      );
      expect(first.status).toBe(201);

      const second = await createTemplate(
        postJson({ name, graphSnapshot: sampleSnapshot, triggerSchema: {} }),
      );
      expect(second.status).toBe(409);
    });

    test("400 on missing name", async () => {
      const res = await createTemplate(
        postJson({ graphSnapshot: sampleSnapshot, triggerSchema: {} }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/templates/:id", () => {
    test("204 on delete org-scoped template", async () => {
      const createRes = await createTemplate(
        postJson({
          name: `Del-${crypto.randomUUID().slice(0, 8)}`,
          graphSnapshot: sampleSnapshot,
          triggerSchema: {},
        }),
      );
      const { id } = await createRes.json();

      const res = await deleteTemplate(
        new Request(`http://localhost/api/templates/${id}`, { method: "DELETE" }),
        makeParams(id),
      );
      expect(res.status).toBe(204);
    });

    test("403 on delete built-in template", async () => {
      const builtInId = await seedBuiltInTemplate(`no-del-${crypto.randomUUID().slice(0, 8)}`);

      const res = await deleteTemplate(
        new Request(`http://localhost/api/templates/${builtInId}`, { method: "DELETE" }),
        makeParams(builtInId),
      );
      expect(res.status).toBe(403);
    });

    test("404 on non-existent template", async () => {
      const fakeId = crypto.randomUUID();
      const res = await deleteTemplate(
        new Request(`http://localhost/api/templates/${fakeId}`, { method: "DELETE" }),
        makeParams(fakeId),
      );
      expect(res.status).toBe(404);
    });
  });
});
