import type { PersistenceAdapter, HookAdapter } from "./adapters";

// --- Execution types ---

export interface StepInput {
  steps: Record<string, Record<string, unknown>>;
  trigger: Record<string, unknown>;
}

export type StepOutput = Record<string, unknown>;

export type StepHandler = (
  config: Record<string, unknown>,
  input: StepInput,
) => Promise<StepOutput>;

// --- Registry ---

export type StepRegistry = Record<string, { handler: StepHandler }>;

// --- Graph snapshot (consumer → walker contract) ---

export interface GraphSnapshot {
  nodes: Array<{
    id: string;
    type: string;
    label?: string | null;
    slug?: string | null;
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    sourceHandle?: string | null;
    targetNodeId: string;
    targetHandle?: string | null;
  }>;
}

// --- Walker configuration ---

export interface WalkerConfig {
  persistence: PersistenceAdapter;
  steps: StepRegistry;
  hooks?: HookAdapter;
}
