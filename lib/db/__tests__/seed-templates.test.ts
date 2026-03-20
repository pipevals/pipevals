import { describe, expect, test } from "bun:test";
import { seedPipelineDefinitions } from "../seed-templates";
import { validateNodeSlugs } from "../../pipeline/validate-slugs";

describe("seed template definitions", () => {
  test("all definitions produce valid graphSnapshot shape", () => {
    for (const def of seedPipelineDefinitions) {
      const snapshot = { nodes: def.nodes, edges: def.edges };

      expect(Array.isArray(snapshot.nodes)).toBe(true);
      expect(Array.isArray(snapshot.edges)).toBe(true);
      expect(snapshot.nodes.length).toBeGreaterThan(0);
      expect(snapshot.edges.length).toBeGreaterThan(0);

      for (const node of snapshot.nodes) {
        expect(node).toHaveProperty("id");
        expect(node).toHaveProperty("type");
        expect(node).toHaveProperty("label");
        expect(node).toHaveProperty("config");
        expect(typeof node.positionX).toBe("number");
        expect(typeof node.positionY).toBe("number");
      }

      for (const edge of snapshot.edges) {
        expect(edge).toHaveProperty("id");
        expect(edge).toHaveProperty("sourceNodeId");
        expect(edge).toHaveProperty("targetNodeId");
      }
    }
  });

  test("all definitions have required metadata", () => {
    for (const def of seedPipelineDefinitions) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.slug.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(typeof def.triggerSchema).toBe("object");
    }
  });

  test("all slugs are unique", () => {
    const slugs = seedPipelineDefinitions.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("all seed node slugs pass validateNodeSlugs", () => {
    for (const def of seedPipelineDefinitions) {
      const errors = validateNodeSlugs(
        def.nodes.map((n) => ({ id: n.id, slug: n.slug })),
      );
      expect(errors).toEqual([]);
    }
  });
});
