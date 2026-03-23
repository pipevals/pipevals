import { describe, expect, test } from "bun:test";
import { buildGraphSnapshot } from "@/lib/pipeline/build-graph-snapshot";

const makeNode = (overrides: Partial<Parameters<typeof buildGraphSnapshot>[0][number]> = {}) => ({
  id: crypto.randomUUID(),
  type: "api_request" as string,
  label: "Test",
  slug: null as string | null,
  config: {} as Record<string, unknown>,
  positionX: 0,
  positionY: 0,
  ...overrides,
});

const makeEdge = (source: string, target: string) => ({
  id: crypto.randomUUID(),
  sourceNodeId: source,
  sourceHandle: null as string | null,
  targetNodeId: target,
  targetHandle: null as string | null,
  label: null as string | null,
});

describe("buildGraphSnapshot", () => {
  test("returns null when no executable nodes exist", () => {
    const trigger = makeNode({ type: "trigger" });
    expect(buildGraphSnapshot([trigger], [])).toBeNull();
  });

  test("returns null for empty nodes array", () => {
    expect(buildGraphSnapshot([], [])).toBeNull();
  });

  test("filters out trigger nodes", () => {
    const trigger = makeNode({ type: "trigger", label: "Trigger" });
    const step = makeNode({ type: "api_request", label: "Fetch" });
    const result = buildGraphSnapshot([trigger, step], []);

    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.nodes[0].type).toBe("api_request");
  });

  test("filters out edges connected to trigger nodes", () => {
    const trigger = makeNode({ type: "trigger" });
    const n1 = makeNode({ type: "api_request" });
    const n2 = makeNode({ type: "transform" });

    const triggerEdge = makeEdge(trigger.id, n1.id);
    const stepEdge = makeEdge(n1.id, n2.id);

    const result = buildGraphSnapshot(
      [trigger, n1, n2],
      [triggerEdge, stepEdge],
    );

    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0].sourceNodeId).toBe(n1.id);
  });

  test("preserves node slug in snapshot", () => {
    const node = makeNode({ slug: "my-step" });
    const result = buildGraphSnapshot([node], []);

    expect(result!.nodes[0].slug).toBe("my-step");
  });

  test("preserves all node fields", () => {
    const node = makeNode({
      label: "Test Label",
      slug: "test-slug",
      config: { url: "https://example.com" },
      positionX: 100,
      positionY: 200,
    });
    const result = buildGraphSnapshot([node], []);
    const snapshotNode = result!.nodes[0];

    expect(snapshotNode.label).toBe("Test Label");
    expect(snapshotNode.slug).toBe("test-slug");
    expect(snapshotNode.config).toEqual({ url: "https://example.com" });
    expect(snapshotNode.positionX).toBe(100);
    expect(snapshotNode.positionY).toBe(200);
  });

  test("preserves edge handle fields", () => {
    const n1 = makeNode();
    const n2 = makeNode();
    const edge = {
      ...makeEdge(n1.id, n2.id),
      sourceHandle: "out-true",
      targetHandle: "in",
      label: "yes",
    };

    const result = buildGraphSnapshot([n1, n2], [edge]);
    const snapshotEdge = result!.edges[0];

    expect(snapshotEdge.sourceHandle).toBe("out-true");
    expect(snapshotEdge.targetHandle).toBe("in");
    expect(snapshotEdge.label).toBe("yes");
  });
});
