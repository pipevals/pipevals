import { createWalker } from "@pipevals/workflow-walker";
import { persistenceAdapter } from "../persistence-adapter";
import { hookAdapter } from "../hook-adapter";
import { walkerStepRegistry } from "../steps/walker-registry";

export const orchestrate = createWalker({
  persistence: persistenceAdapter,
  steps: walkerStepRegistry,
  hooks: hookAdapter,
});
