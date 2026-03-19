"use client";

import { useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./base-node";
import { TriggerNode } from "./trigger-node";
import type { PipelineNodeData } from "@/lib/stores/pipeline-builder";

type StepNodeProps = NodeProps & { data: PipelineNodeData };

function ApiRequestNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>A</span>}
      color="bg-blue-600"
    />
  );
}

function AiSdkNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>AI</span>}
      color="bg-violet-600"
    />
  );
}

function SandboxNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>S</span>}
      color="bg-amber-600"
    />
  );
}

function ConditionNode(props: StepNodeProps) {
  const handles =
    (props.data.config as { handles?: string[] })?.handles ?? ["true", "false"];

  const outputs = useMemo(
    () => handles.map((h) => ({ id: h, label: h })),
    [handles],
  );

  return (
    <BaseNode
      {...props}
      icon={<span>?</span>}
      color="bg-emerald-600"
      outputs={outputs}
    />
  );
}

function TransformNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>T</span>}
      color="bg-orange-600"
    />
  );
}

function MetricCaptureNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>M</span>}
      color="bg-rose-600"
    />
  );
}

function HumanReviewNode(props: StepNodeProps) {
  return (
    <BaseNode
      {...props}
      icon={<span>H</span>}
      color="bg-cyan-600"
    />
  );
}

export const nodeTypes = {
  api_request: ApiRequestNode,
  ai_sdk: AiSdkNode,
  sandbox: SandboxNode,
  condition: ConditionNode,
  transform: TransformNode,
  metric_capture: MetricCaptureNode,
  human_review: HumanReviewNode,
  trigger: TriggerNode,
} as const;
