import type { GraphSnapshot, StepInput } from "./types";
import type { WalkerNode } from "./core/graph-loader";

// --- Persistence adapter ---

export interface PersistenceAdapter {
  loadRunData(runId: string): Promise<{
    graphSnapshot: GraphSnapshot;
    triggerPayload: Record<string, unknown>;
  }>;

  updateRunStatus(
    runId: string,
    status: "running" | "completed" | "failed",
  ): Promise<void>;

  recordStepRunning(runId: string, nodeId: string): Promise<void>;

  recordStepCompleted(
    runId: string,
    nodeId: string,
    input: unknown,
    output: unknown,
    durationMs: number,
  ): Promise<void>;

  recordStepFailed(
    runId: string,
    nodeId: string,
    input: unknown,
    error: unknown,
    durationMs: number,
  ): Promise<void>;
}

// --- Hook adapter (optional, for suspendable steps) ---

export interface HookAdapter {
  /** Returns true if this node requires workflow-level suspension. */
  shouldSuspend(node: WalkerNode): boolean;

  /**
   * Executes a suspendable node at the workflow level.
   * Called outside "use step" so it can use defineHook/create/await.
   */
  executeSuspendable(
    runId: string,
    node: WalkerNode,
    input: StepInput,
  ): Promise<Record<string, unknown>>;
}
