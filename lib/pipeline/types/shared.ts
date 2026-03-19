export interface EvalRunSummary {
  id: string;
  pipelineId?: string;
  datasetId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
}

export interface DatasetInfo {
  id: string;
  name: string;
}
