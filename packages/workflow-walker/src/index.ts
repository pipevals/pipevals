// Factory
export { createWalker } from "./walker";

// Adapter interfaces
export type { PersistenceAdapter, HookAdapter } from "./adapters";

// Types
export type {
  StepInput,
  StepOutput,
  StepHandler,
  StepRegistry,
  GraphSnapshot,
  WalkerConfig,
} from "./types";

// Core graph utilities
export { loadGraph } from "./core/graph-loader";
export type {
  WalkerNode,
  WalkerEdge,
  PipelineGraph,
} from "./core/graph-loader";
export { topologicalSort } from "./core/topological-sort";
export { BranchResolver } from "./core/branch-resolver";
export { resolveInputs } from "./core/input-resolver";

// Dot-path utilities
export {
  resolveDotPath,
  resolveTemplate,
  DotPathError,
} from "./core/dot-path";
