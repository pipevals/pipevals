export function getWorkflowRunUrl(workflowRunId: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_WORKFLOW_INSPECT_URL;
  if (!base || !workflowRunId) return null;

  if (base.includes("vercel.com")) {
    return `${base.replace(/\/$/, "")}/runs/${workflowRunId}?environment=production`;
  }

  return `${base.replace(/\/$/, "")}?resource=run&id=${workflowRunId}`;
}
