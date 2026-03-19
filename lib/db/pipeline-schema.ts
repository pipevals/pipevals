import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

export const stepTypeEnum = [
  "api_request",
  "ai_sdk",
  "sandbox",
  "condition",
  "transform",
  "metric_capture",
] as const;

// Includes all step types plus the UI-only trigger node type.
export const pipelineNodeTypeEnum = [...stepTypeEnum, "trigger"] as const;

export const pipelines = pgTable(
  "pipeline",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    triggerSchema: jsonb("trigger_schema")
      .$type<Record<string, unknown>>()
      .default({}),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pipeline_slug_org_uidx").on(
      table.slug,
      table.organizationId,
    ),
    index("pipeline_org_idx").on(table.organizationId),
  ],
);

export const pipelineNodes = pgTable(
  "pipeline_node",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    type: text("type", { enum: pipelineNodeTypeEnum }).notNull(),
    label: text("label"),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    positionX: real("position_x").notNull().default(0),
    positionY: real("position_y").notNull().default(0),
  },
  (table) => [index("pipeline_node_pipeline_idx").on(table.pipelineId)],
);

export const pipelineEdges = pgTable(
  "pipeline_edge",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    sourceNodeId: text("source_node_id")
      .notNull()
      .references(() => pipelineNodes.id, { onDelete: "cascade" }),
    sourceHandle: text("source_handle"),
    targetNodeId: text("target_node_id")
      .notNull()
      .references(() => pipelineNodes.id, { onDelete: "cascade" }),
    targetHandle: text("target_handle"),
    label: text("label"),
  },
  (table) => [
    index("pipeline_edge_pipeline_idx").on(table.pipelineId),
    index("pipeline_edge_source_idx").on(table.sourceNodeId),
    index("pipeline_edge_target_idx").on(table.targetNodeId),
  ],
);

export const runStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export const pipelineRuns = pgTable(
  "pipeline_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    status: text("status", { enum: runStatusEnum })
      .notNull()
      .default("pending"),
    triggerPayload: jsonb("trigger_payload").$type<Record<string, unknown>>(),
    graphSnapshot: jsonb("graph_snapshot")
      .$type<{ nodes: unknown[]; edges: unknown[] }>()
      .notNull(),
    workflowRunId: text("workflow_run_id"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pipeline_run_pipeline_idx").on(table.pipelineId),
    index("pipeline_run_status_idx").on(table.status),
  ],
);

export const stepResultStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;

export const stepResults = pgTable(
  "step_result",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    status: text("status", { enum: stepResultStatusEnum })
      .notNull()
      .default("pending"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: jsonb("error").$type<Record<string, unknown>>(),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("step_result_run_node_uidx").on(table.runId, table.nodeId),
    index("step_result_run_idx").on(table.runId),
  ],
);

// --- Relations ---

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  organization: one(organization, {
    fields: [pipelines.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [pipelines.createdBy],
    references: [user.id],
  }),
  nodes: many(pipelineNodes),
  edges: many(pipelineEdges),
  runs: many(pipelineRuns),
}));

export const pipelineNodesRelations = relations(
  pipelineNodes,
  ({ one, many }) => ({
    pipeline: one(pipelines, {
      fields: [pipelineNodes.pipelineId],
      references: [pipelines.id],
    }),
    sourceEdges: many(pipelineEdges, { relationName: "sourceNode" }),
    targetEdges: many(pipelineEdges, { relationName: "targetNode" }),
  }),
);

export const pipelineEdgesRelations = relations(pipelineEdges, ({ one }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineEdges.pipelineId],
    references: [pipelines.id],
  }),
  sourceNode: one(pipelineNodes, {
    fields: [pipelineEdges.sourceNodeId],
    references: [pipelineNodes.id],
    relationName: "sourceNode",
  }),
  targetNode: one(pipelineNodes, {
    fields: [pipelineEdges.targetNodeId],
    references: [pipelineNodes.id],
    relationName: "targetNode",
  }),
}));

export const pipelineRunsRelations = relations(
  pipelineRuns,
  ({ one, many }) => ({
    pipeline: one(pipelines, {
      fields: [pipelineRuns.pipelineId],
      references: [pipelines.id],
    }),
    stepResults: many(stepResults),
  }),
);

export const stepResultsRelations = relations(stepResults, ({ one }) => ({
  run: one(pipelineRuns, {
    fields: [stepResults.runId],
    references: [pipelineRuns.id],
  }),
}));
