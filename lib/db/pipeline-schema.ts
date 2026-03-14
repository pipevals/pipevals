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

export const pipelines = pgTable(
  "pipeline",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
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
    uniqueIndex("pipeline_name_org_uidx").on(
      table.name,
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
    type: text("type", { enum: stepTypeEnum }).notNull(),
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
