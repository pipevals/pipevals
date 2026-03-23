import { describe, expect, test, beforeAll } from "bun:test";
import { setupMocks, setActiveHeaders, createAuthenticatedUser, type TestContext } from "./setup";

const { db: testDb } = await setupMocks();

const { GET: listDatasets, POST: createDataset } = await import(
  "@/app/api/datasets/route"
);
const {
  GET: getDataset,
  PUT: updateDataset,
  DELETE: deleteDataset,
} = await import("@/app/api/datasets/[id]/route");
const { POST: addItems } = await import(
  "@/app/api/datasets/[id]/items/route"
);
const { DELETE: deleteItem } = await import(
  "@/app/api/datasets/[id]/items/[itemId]/route"
);

let ctx: TestContext;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeItemParams(id: string, itemId: string) {
  return { params: Promise.resolve({ id, itemId }) };
}

function postJson(body: unknown) {
  return new Request("http://localhost/api/datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(body: unknown) {
  return new Request("http://localhost/api/datasets/x", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postItemsJson(body: unknown) {
  return new Request("http://localhost/api/datasets/x/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("dataset CRUD (PGlite integration)", () => {
  beforeAll(async () => {
    ctx = await createAuthenticatedUser();
    setActiveHeaders(ctx.headers);
  });

  describe("POST /api/datasets", () => {
    test("201 creates dataset with schema", async () => {
      const res = await createDataset(
        postJson({ name: "Golden Set", schema: { prompt: "", expected: "" } }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Golden Set");
      expect(data.schema).toEqual({ prompt: "", expected: "" });
      expect(data.itemCount).toBe(0);
    });

    test("201 creates dataset with initial items", async () => {
      const res = await createDataset(
        postJson({
          name: "With Items",
          schema: { prompt: "" },
          items: [{ prompt: "hello" }, { prompt: "world" }],
        }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.itemCount).toBe(2);
    });

    test("400 on missing name", async () => {
      const res = await createDataset(
        postJson({ schema: { prompt: "" } }),
      );
      expect(res.status).toBe(400);
    });

    test("400 on missing schema", async () => {
      const res = await createDataset(postJson({ name: "No Schema" }));
      expect(res.status).toBe(400);
    });

    test("400 on empty schema", async () => {
      const res = await createDataset(
        postJson({ name: "Empty Schema", schema: {} }),
      );
      expect(res.status).toBe(400);
    });

    test("400 on items with wrong keys", async () => {
      const res = await createDataset(
        postJson({
          name: "Bad Items",
          schema: { prompt: "" },
          items: [{ wrong_key: "value" }],
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/datasets", () => {
    test("200 returns list with item counts and totalCount", async () => {
      const res = await listDatasets(new Request("http://localhost/api/datasets"));
      expect(res.status).toBe(200);
      const { data, totalCount } = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(totalCount).toBeGreaterThanOrEqual(2);
      expect(data[0].itemCount).toBeDefined();
    });
  });

  describe("GET /api/datasets/:id", () => {
    test("200 returns dataset with items", async () => {
      // Create a dataset with items first
      const createRes = await createDataset(
        postJson({
          name: "Fetch Test",
          schema: { input: "" },
          items: [{ input: "a" }, { input: "b" }],
        }),
      );
      const { id } = await createRes.json();

      const res = await getDataset(new Request("http://localhost"), makeParams(id));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Fetch Test");
      expect(data.items).toHaveLength(2);
      expect(data.items[0].index).toBe(0);
      expect(data.items[1].index).toBe(1);
    });

    test("404 on nonexistent dataset", async () => {
      const res = await getDataset(
        new Request("http://localhost"),
        makeParams("nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/datasets/:id", () => {
    test("200 updates name", async () => {
      const createRes = await createDataset(
        postJson({ name: "Old Name", schema: { x: "" } }),
      );
      const { id } = await createRes.json();

      const res = await updateDataset(
        putJson({ name: "New Name" }),
        makeParams(id),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("New Name");
    });

    test("ignores schema field in update", async () => {
      const createRes = await createDataset(
        postJson({ name: "Schema Lock", schema: { original: "" } }),
      );
      const { id } = await createRes.json();

      await updateDataset(
        putJson({ schema: { changed: "" } }),
        makeParams(id),
      );

      const getRes = await getDataset(new Request("http://localhost"), makeParams(id));
      const data = await getRes.json();
      expect(data.schema).toEqual({ original: "" });
    });
  });

  describe("DELETE /api/datasets/:id", () => {
    test("204 deletes dataset and items", async () => {
      const createRes = await createDataset(
        postJson({ name: "To Delete", schema: { x: "" }, items: [{ x: "val" }] }),
      );
      const { id } = await createRes.json();

      const res = await deleteDataset(
        new Request("http://localhost", { method: "DELETE" }),
        makeParams(id),
      );
      expect(res.status).toBe(204);

      const getRes = await getDataset(new Request("http://localhost"), makeParams(id));
      expect(getRes.status).toBe(404);
    });
  });

  describe("POST /api/datasets/:id/items", () => {
    test("201 appends items with correct indexes", async () => {
      const createRes = await createDataset(
        postJson({ name: "Append Test", schema: { val: "" }, items: [{ val: "a" }] }),
      );
      const { id } = await createRes.json();

      const res = await addItems(postItemsJson([{ val: "b" }, { val: "c" }]), makeParams(id));
      expect(res.status).toBe(201);
      const items = await res.json();
      expect(items).toHaveLength(2);
      expect(items[0].index).toBe(1);
      expect(items[1].index).toBe(2);
    });

    test("400 on invalid item keys", async () => {
      const createRes = await createDataset(
        postJson({ name: "Bad Append", schema: { val: "" } }),
      );
      const { id } = await createRes.json();

      const res = await addItems(postItemsJson([{ wrong: "data" }]), makeParams(id));
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/datasets/:id/items/:itemId", () => {
    test("204 deletes item without re-indexing", async () => {
      const createRes = await createDataset(
        postJson({ name: "Item Delete", schema: { v: "" }, items: [{ v: "1" }, { v: "2" }, { v: "3" }] }),
      );
      const { id } = await createRes.json();

      const getRes = await getDataset(new Request("http://localhost"), makeParams(id));
      const { items } = await getRes.json();
      const middleItemId = items[1].id;

      const res = await deleteItem(
        new Request("http://localhost", { method: "DELETE" }),
        makeItemParams(id, middleItemId),
      );
      expect(res.status).toBe(204);

      // Remaining items keep original indexes (0 and 2)
      const getRes2 = await getDataset(new Request("http://localhost"), makeParams(id));
      const data = await getRes2.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].index).toBe(0);
      expect(data.items[1].index).toBe(2);
    });

    test("404 on nonexistent item", async () => {
      const createRes = await createDataset(
        postJson({ name: "No Such Item", schema: { x: "" } }),
      );
      const { id } = await createRes.json();

      const res = await deleteItem(
        new Request("http://localhost", { method: "DELETE" }),
        makeItemParams(id, "nonexistent"),
      );
      expect(res.status).toBe(404);
    });
  });
});
