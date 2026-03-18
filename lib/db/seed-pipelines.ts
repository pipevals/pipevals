import { eq, and } from "drizzle-orm";
import { pipelines, pipelineNodes, pipelineEdges } from "./pipeline-schema";
import type { PipelineNodeType } from "../pipeline/types";
import type { db as appDb } from ".";

interface SeedNode {
  id: string;
  type: PipelineNodeType;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

interface SeedEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string | null;
  targetNodeId: string;
  targetHandle: string | null;
}

export interface SeedPipelineDefinition {
  name: string;
  slug: string;
  description: string;
  triggerSchema: Record<string, unknown>;
  nodes: SeedNode[];
  edges: SeedEdge[];
}

// ---------------------------------------------------------------------------
// AI-as-a-Judge Scoring
// ---------------------------------------------------------------------------

const JUDGE_PROMPT = [
  "You are an expert evaluator. Score the following AI-generated response on two criteria:",
  "",
  "1. Relevance - Does the response directly address the prompt?",
  "2. Coherence - Is the response well-structured, logical, and easy to follow?",
  "",
  "Use a 1-5 scale for each:",
  "- 1: Very poor",
  "- 2: Poor",
  "- 3: Acceptable",
  "- 4: Good",
  "- 5: Excellent",
  "",
  "Prompt: ${trigger.prompt}",
  "",
  "Response to evaluate: ${steps.Generator.text}",
].join("\n");

const aiAsAJudge: SeedPipelineDefinition = {
  name: "AI-as-a-Judge Scoring",
  slug: "ai-as-a-judge-scoring",
  description:
    "Generates a response to a prompt, then uses a second LLM call to score it on relevance and coherence (1-5). Demonstrates the most common AI evaluation pattern.",
  triggerSchema: {
    type: "object",
    properties: {
      prompt: { type: "string" },
    },
    required: ["prompt"],
  },
  nodes: [
    {
      id: "seed-judge-trigger",
      type: "trigger",
      label: "Trigger",
      config: {},
      positionX: 0,
      positionY: 150,
    },
    {
      id: "seed-judge-generator",
      type: "ai_sdk",
      label: "Generator",
      config: {
        type: "ai_sdk",
        model: "openai/gpt-4o",
        promptTemplate: "trigger.prompt",
        temperature: 0.7,
      },
      positionX: 300,
      positionY: 150,
    },
    {
      id: "seed-judge-judge",
      type: "ai_sdk",
      label: "Judge",
      config: {
        type: "ai_sdk",
        model: "openai/gpt-4o",
        promptTemplate: JUDGE_PROMPT,
        temperature: 0,
        responseFormat: {
          type: "object",
          properties: {
            relevance: { type: "number" },
            coherence: { type: "number" },
            score: { type: "number" },
            reasoning: { type: "string" },
          },
          required: ["relevance", "coherence", "score", "reasoning"],
        },
      },
      positionX: 600,
      positionY: 150,
    },
    {
      id: "seed-judge-metrics",
      type: "metric_capture",
      label: "Metrics",
      config: {
        type: "metric_capture",
        metrics: {
          relevance: "steps.Judge.object.relevance",
          coherence: "steps.Judge.object.coherence",
          score: "steps.Judge.object.score",
          reasoning: "steps.Judge.object.reasoning",
        },
      },
      positionX: 900,
      positionY: 150,
    },
  ],
  edges: [
    {
      id: "seed-judge-e1",
      sourceNodeId: "seed-judge-trigger",
      sourceHandle: null,
      targetNodeId: "seed-judge-generator",
      targetHandle: null,
    },
    {
      id: "seed-judge-e2",
      sourceNodeId: "seed-judge-generator",
      sourceHandle: null,
      targetNodeId: "seed-judge-judge",
      targetHandle: null,
    },
    {
      id: "seed-judge-e3",
      sourceNodeId: "seed-judge-judge",
      sourceHandle: null,
      targetNodeId: "seed-judge-metrics",
      targetHandle: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// Model A/B Comparison
// ---------------------------------------------------------------------------

const COMPARISON_JUDGE_PROMPT = [
  "You are an impartial judge comparing two AI-generated responses to the same prompt.",
  "",
  "Evaluate each response on overall quality (clarity, accuracy, helpfulness, and depth).",
  "",
  "Original prompt: ${trigger.prompt}",
  "",
  "Response A: ${steps.Collect Responses.response_a}",
  "",
  "Response B: ${steps.Collect Responses.response_b}",
  "",
  "Score each response 1-5 and pick a winner.",
].join("\n");

const modelAbComparison: SeedPipelineDefinition = {
  name: "Model A/B Comparison",
  slug: "model-ab-comparison",
  description:
    "Sends the same prompt to two different models in parallel, then uses a judge to compare and score both responses. Demonstrates pairwise model evaluation.",
  triggerSchema: {
    type: "object",
    properties: {
      prompt: { type: "string" },
    },
    required: ["prompt"],
  },
  nodes: [
    {
      id: "seed-ab-trigger",
      type: "trigger",
      label: "Trigger",
      config: {},
      positionX: 0,
      positionY: 200,
    },
    {
      id: "seed-ab-model-a",
      type: "ai_sdk",
      label: "Model A",
      config: {
        type: "ai_sdk",
        model: "openai/gpt-4o",
        promptTemplate: "trigger.prompt",
        temperature: 0.7,
      },
      positionX: 300,
      positionY: 75,
    },
    {
      id: "seed-ab-model-b",
      type: "ai_sdk",
      label: "Model B",
      config: {
        type: "ai_sdk",
        model: "anthropic/claude-sonnet-4-5-20250514",
        promptTemplate: "trigger.prompt",
        temperature: 0.7,
      },
      positionX: 300,
      positionY: 325,
    },
    {
      id: "seed-ab-collect",
      type: "transform",
      label: "Collect Responses",
      config: {
        type: "transform",
        mapping: {
          response_a: "steps.Model A.text",
          response_b: "steps.Model B.text",
        },
      },
      positionX: 600,
      positionY: 200,
    },
    {
      id: "seed-ab-judge",
      type: "ai_sdk",
      label: "Judge",
      config: {
        type: "ai_sdk",
        model: "openai/gpt-4o",
        promptTemplate: COMPARISON_JUDGE_PROMPT,
        temperature: 0,
        responseFormat: {
          type: "object",
          properties: {
            score_a: { type: "number" },
            score_b: { type: "number" },
            winner: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["score_a", "score_b", "winner", "reasoning"],
        },
      },
      positionX: 900,
      positionY: 200,
    },
    {
      id: "seed-ab-metrics",
      type: "metric_capture",
      label: "Metrics",
      config: {
        type: "metric_capture",
        metrics: {
          score_a: "steps.Judge.object.score_a",
          score_b: "steps.Judge.object.score_b",
          winner: "steps.Judge.object.winner",
          reasoning: "steps.Judge.object.reasoning",
        },
      },
      positionX: 1200,
      positionY: 200,
    },
  ],
  edges: [
    {
      id: "seed-ab-e1",
      sourceNodeId: "seed-ab-trigger",
      sourceHandle: null,
      targetNodeId: "seed-ab-model-a",
      targetHandle: null,
    },
    {
      id: "seed-ab-e2",
      sourceNodeId: "seed-ab-trigger",
      sourceHandle: null,
      targetNodeId: "seed-ab-model-b",
      targetHandle: null,
    },
    {
      id: "seed-ab-e3",
      sourceNodeId: "seed-ab-model-a",
      sourceHandle: null,
      targetNodeId: "seed-ab-collect",
      targetHandle: null,
    },
    {
      id: "seed-ab-e4",
      sourceNodeId: "seed-ab-model-b",
      sourceHandle: null,
      targetNodeId: "seed-ab-collect",
      targetHandle: null,
    },
    {
      id: "seed-ab-e5",
      sourceNodeId: "seed-ab-collect",
      sourceHandle: null,
      targetNodeId: "seed-ab-judge",
      targetHandle: null,
    },
    {
      id: "seed-ab-e6",
      sourceNodeId: "seed-ab-judge",
      sourceHandle: null,
      targetNodeId: "seed-ab-metrics",
      targetHandle: null,
    },
  ],
};

export const seedPipelineDefinitions: SeedPipelineDefinition[] = [
  aiAsAJudge,
  modelAbComparison,
];

export async function seedPipelines(
  db: typeof appDb,
  organizationId: string,
  createdBy: string,
) {
  for (const def of seedPipelineDefinitions) {
    // Idempotency: skip if slug already exists in this org
    const existing = await db.select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.slug, def.slug), eq(pipelines.organizationId, organizationId)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭ Skipped "${def.name}" (already exists)`);
      continue;
    }

    await db.transaction(async (tx) => {
      const [pipeline] = await tx
        .insert(pipelines)
        .values({
          name: def.name,
          slug: def.slug,
          description: def.description,
          triggerSchema: def.triggerSchema,
          organizationId,
          createdBy,
        })
        .returning({ id: pipelines.id });

      if (def.nodes.length > 0) {
        await tx.insert(pipelineNodes).values(
          def.nodes.map((n) => ({
            id: n.id,
            pipelineId: pipeline.id,
            type: n.type,
            label: n.label,
            config: n.config,
            positionX: n.positionX,
            positionY: n.positionY,
          })),
        );
      }

      if (def.edges.length > 0) {
        await tx.insert(pipelineEdges).values(
          def.edges.map((e) => ({
            id: e.id,
            pipelineId: pipeline.id,
            sourceNodeId: e.sourceNodeId,
            sourceHandle: e.sourceHandle,
            targetNodeId: e.targetNodeId,
            targetHandle: e.targetHandle,
          })),
        );
      }

      console.log(`  ✔ Created "${def.name}" (${pipeline.id})`);
    });
  }
}
