import { describe, expect, test } from "bun:test";
import { seedPipelineDefinitions } from "../seed-pipelines";
import { nodeConfigSchema } from "../../pipeline/config-schemas";
import { validateGraph } from "../../pipeline/graph-validation";

describe("seed pipeline definitions", () => {
  for (const def of seedPipelineDefinitions) {
    describe(def.name, () => {
      test("all node configs pass their Zod schemas", () => {
        for (const node of def.nodes) {
          if (node.type === "trigger") continue;
          const result = nodeConfigSchema.safeParse(node.config);
          if (!result.success) {
            throw new Error(
              `Node "${node.label}" (${node.type}) failed validation: ${result.error.message}`,
            );
          }
        }
      });

      test("graph passes validateGraph", () => {
        const nodes = def.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          config: n.config,
        }));
        const edges = def.edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          sourceHandle: e.sourceHandle,
          targetNodeId: e.targetNodeId,
          targetHandle: e.targetHandle,
        }));
        const result = validateGraph(nodes, edges);
        expect(result).toEqual({ valid: true, errors: [] });
      });
    });
  }
});
