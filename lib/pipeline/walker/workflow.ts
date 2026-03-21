import { orchestrate } from "./pipeline-walker";

export async function runPipelineWorkflow(runId: string) {
  "use workflow";
  return orchestrate(runId);
}
