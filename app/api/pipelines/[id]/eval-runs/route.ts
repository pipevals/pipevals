import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  datasets,
  datasetItems,
  evalRuns,
  pipelineRuns,
} from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { start } from "workflow/api";
import { runPipelineWorkflow } from "@/lib/pipeline/walker/workflow";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, true);
  if ("error" in result) return result.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.datasetId !== "string") {
    return NextResponse.json(
      { error: "datasetId is required" },
      { status: 400 },
    );
  }

  // Load dataset and verify org ownership
  const dataset = await db.query.datasets.findFirst({
    where: and(
      eq(datasets.id, body.datasetId),
      eq(datasets.organizationId, result.organizationId),
    ),
  });

  if (!dataset) {
    return NextResponse.json(
      { error: "Dataset not found" },
      { status: 404 },
    );
  }

  // Load dataset items
  const items = await db
    .select()
    .from(datasetItems)
    .where(eq(datasetItems.datasetId, dataset.id));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Dataset has no items" },
      { status: 400 },
    );
  }

  // Schema compatibility check: exact key match
  const pipelineTriggerSchema = (result.pipeline.triggerSchema ?? {}) as Record<
    string,
    unknown
  >;
  const pipelineKeys = Object.keys(pipelineTriggerSchema).sort();
  const datasetKeys = Object.keys(dataset.schema).sort();

  if (
    pipelineKeys.length !== datasetKeys.length ||
    !pipelineKeys.every((k, i) => k === datasetKeys[i])
  ) {
    return NextResponse.json(
      {
        error: `Schema mismatch: pipeline expects keys [${pipelineKeys.join(", ")}] but dataset has [${datasetKeys.join(", ")}]`,
      },
      { status: 400 },
    );
  }

  // Validate pipeline has executable nodes
  const { nodes, edges } = result.pipeline;
  const executableNodes = nodes.filter((n) => n.type !== "trigger");
  const triggerNodeIds = new Set(
    nodes.filter((n) => n.type === "trigger").map((n) => n.id),
  );

  if (executableNodes.length === 0) {
    return NextResponse.json(
      { error: "Pipeline has no nodes to execute" },
      { status: 400 },
    );
  }

  // Snapshot graph once (shared across all runs)
  const snapshotEdges = edges
    .filter(
      (e) =>
        !triggerNodeIds.has(e.sourceNodeId) &&
        !triggerNodeIds.has(e.targetNodeId),
    )
    .map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      sourceHandle: e.sourceHandle,
      targetNodeId: e.targetNodeId,
      targetHandle: e.targetHandle,
      label: e.label,
    }));

  const graphSnapshot = {
    nodes: executableNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: n.config,
      positionX: n.positionX,
      positionY: n.positionY,
    })),
    edges: snapshotEdges,
  };

  // Create eval run
  const [evalRun] = await db
    .insert(evalRuns)
    .values({
      pipelineId: id,
      datasetId: dataset.id,
      totalItems: items.length,
    })
    .returning();

  // Create one pipeline run per item
  const runRows = await db
    .insert(pipelineRuns)
    .values(
      items.map((item) => ({
        pipelineId: id,
        status: "pending" as const,
        triggerPayload: item.data,
        graphSnapshot,
        evalRunId: evalRun.id,
      })),
    )
    .returning({ id: pipelineRuns.id });

  // Start all workflows concurrently
  const workflowResults = await Promise.all(
    runRows.map(async (run) => {
      const wf = await start(runPipelineWorkflow, [run.id]);
      return { runId: run.id, workflowRunId: wf.runId };
    }),
  );

  // Update workflow run IDs
  await Promise.all(
    workflowResults.map(({ runId, workflowRunId }) =>
      db
        .update(pipelineRuns)
        .set({ workflowRunId })
        .where(eq(pipelineRuns.id, runId)),
    ),
  );

  // Mark eval run as running
  await db
    .update(evalRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(evalRuns.id, evalRun.id));

  return NextResponse.json({ evalRunId: evalRun.id }, { status: 202 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const rows = await db
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.pipelineId, id))
    .orderBy(desc(evalRuns.createdAt));

  return NextResponse.json(rows);
}
