import { relations, sql } from "drizzle-orm";
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
  "human_review",
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
    slug: text("slug"),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    positionX: real("position_x").notNull().default(0),
    positionY: real("position_y").notNull().default(0),
  },
  (table) => [
    index("pipeline_node_pipeline_idx").on(table.pipelineId),
    uniqueIndex("pipeline_node_slug_uidx")
      .on(table.pipelineId, table.slug)
      .where(sql`${table.slug} IS NOT NULL`),
  ],
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

export const pipelineTemplates = pgTable(
  "pipeline_template",
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
    graphSnapshot: jsonb("graph_snapshot")
      .$type<{ nodes: unknown[]; edges: unknown[] }>()
      .notNull(),
    organizationId: text("organization_id").references(
      () => organization.id,
      { onDelete: "cascade" },
    ),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tmpl_slug_org_uidx")
      .on(table.slug, table.organizationId)
      .where(sql`${table.organizationId} IS NOT NULL`),
    uniqueIndex("tmpl_slug_builtin_uidx")
      .on(table.slug)
      .where(sql`${table.organizationId} IS NULL`),
    index("tmpl_org_idx").on(table.organizationId),
  ],
);

export const runStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "awaiting_review",
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
    evalRunId: text("eval_run_id").references(() => evalRuns.id, {
      onDelete: "cascade",
    }),
    workflowRunId: text("workflow_run_id"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pipeline_run_pipeline_idx").on(table.pipelineId),
    index("pipeline_run_status_idx").on(table.status),
    index("pipeline_run_eval_run_idx").on(table.evalRunId),
  ],
);

export const stepResultStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
  "awaiting_review",
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

export const taskStatusEnum = ["pending", "completed"] as const;

export const tasks = pgTable(
  "task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    hookToken: text("hook_token").notNull(),
    status: text("status", { enum: taskStatusEnum })
      .notNull()
      .default("pending"),
    rubric: jsonb("rubric").$type<Record<string, unknown>[]>().notNull(),
    displayData: jsonb("display_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    response: jsonb("response").$type<Record<string, unknown>>(),
    reviewerIndex: integer("reviewer_index").notNull().default(0),
    reviewedBy: text("reviewed_by").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("task_hook_token_uidx").on(table.hookToken),
    index("task_run_idx").on(table.runId),
    index("task_pipeline_idx").on(table.pipelineId),
  ],
);

// --- Datasets ---

export const datasets = pgTable(
  "dataset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    schema: jsonb("schema")
      .$type<Record<string, string>>()
      .notNull(),
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
  (table) => [index("dataset_org_idx").on(table.organizationId)],
);

export const datasetItems = pgTable(
  "dataset_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    index: integer("index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dataset_item_dataset_idx").on(table.datasetId),
    uniqueIndex("dataset_item_dataset_index_uidx").on(
      table.datasetId,
      table.index,
    ),
  ],
);

// --- Eval Runs ---

export const evalRunStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;

export const evalRuns = pgTable(
  "eval_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pipelineId: text("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    status: text("status", { enum: evalRunStatusEnum })
      .notNull()
      .default("pending"),
    totalItems: integer("total_items").notNull(),
    completedItems: integer("completed_items").notNull().default(0),
    failedItems: integer("failed_items").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("eval_run_pipeline_idx").on(table.pipelineId),
    index("eval_run_dataset_idx").on(table.datasetId),
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
  tasks: many(tasks),
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

export const pipelineTemplatesRelations = relations(
  pipelineTemplates,
  ({ one }) => ({
    organization: one(organization, {
      fields: [pipelineTemplates.organizationId],
      references: [organization.id],
    }),
    creator: one(user, {
      fields: [pipelineTemplates.createdBy],
      references: [user.id],
    }),
  }),
);

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  organization: one(organization, {
    fields: [datasets.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [datasets.createdBy],
    references: [user.id],
  }),
  items: many(datasetItems),
  evalRuns: many(evalRuns),
}));

export const datasetItemsRelations = relations(datasetItems, ({ one }) => ({
  dataset: one(datasets, {
    fields: [datasetItems.datasetId],
    references: [datasets.id],
  }),
}));

export const evalRunsRelations = relations(evalRuns, ({ one, many }) => ({
  pipeline: one(pipelines, {
    fields: [evalRuns.pipelineId],
    references: [pipelines.id],
  }),
  dataset: one(datasets, {
    fields: [evalRuns.datasetId],
    references: [datasets.id],
  }),
  runs: many(pipelineRuns),
}));

export const pipelineRunsRelations = relations(
  pipelineRuns,
  ({ one, many }) => ({
    pipeline: one(pipelines, {
      fields: [pipelineRuns.pipelineId],
      references: [pipelines.id],
    }),
    evalRun: one(evalRuns, {
      fields: [pipelineRuns.evalRunId],
      references: [evalRuns.id],
    }),
    stepResults: many(stepResults),
    tasks: many(tasks),
  }),
);

export const stepResultsRelations = relations(stepResults, ({ one }) => ({
  run: one(pipelineRuns, {
    fields: [stepResults.runId],
    references: [pipelineRuns.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  pipeline: one(pipelines, {
    fields: [tasks.pipelineId],
    references: [pipelines.id],
  }),
  run: one(pipelineRuns, {
    fields: [tasks.runId],
    references: [pipelineRuns.id],
  }),
  reviewer: one(user, {
    fields: [tasks.reviewedBy],
    references: [user.id],
  }),
}));
