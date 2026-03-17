import type { StepType } from "./types";
import { TRIGGER_NODE_ID } from "@/lib/stores/pipeline-builder";

// The primary output key each step type produces
const PRIMARY_OUTPUT: Record<StepType | "trigger", string | null> = {
  trigger: null, // resolved dynamically from triggerSchema
  api_request: "body",
  ai_sdk: "text",
  sandbox: null, // unknown output shape
  condition: null, // branching node, no data output
  transform: null, // output keys are user-defined
  metric_capture: "value",
};

// The config field to auto-populate on the target node (null = skip)
const PRIMARY_INPUT_FIELD: Record<StepType, string | null> = {
  api_request: "url",
  ai_sdk: "promptTemplate",
  sandbox: null,
  condition: "expression",
  transform: "__mapping__", // special case handled below
  metric_capture: "extractPath",
};

export interface AutoWirePatch {
  config: Record<string, unknown>;
}

/**
 * Returns a config patch to apply to the target node when a new edge is drawn,
 * or null if no auto-wire is applicable.
 *
 * Rules:
 * - Only populates string fields that are currently "" or undefined
 * - Transform gets a new mapping entry added (always additive)
 * - Sandbox and condition sources are skipped
 * - Trigger source uses `trigger.<firstSchemaKey>` or bare `trigger`
 */
export function autoWireInputs(
  sourceId: string,
  sourceType: string,
  sourceLabel: string | null | undefined,
  sourceConfig: Record<string, unknown>,
  targetType: string,
  targetConfig: Record<string, unknown>,
  triggerSchema: Record<string, unknown>,
): AutoWirePatch | null {
  // Determine the dot-path prefix for the source
  let dotPath: string;

  if (sourceId === TRIGGER_NODE_ID || sourceType === "trigger") {
    const firstKey = Object.keys(triggerSchema)[0];
    dotPath = firstKey ? `trigger.${firstKey}` : "trigger";
  } else {
    const outputKey = PRIMARY_OUTPUT[sourceType as StepType];
    if (outputKey === null || outputKey === undefined) return null;

    const label = sourceLabel?.trim() || sourceId;
    dotPath = `steps.${label}.${outputKey}`;
  }

  // Determine which field to populate on the target
  const inputField = PRIMARY_INPUT_FIELD[targetType as StepType];
  if (inputField === null || inputField === undefined) return null;

  // Special case: transform target adds a mapping entry
  if (inputField === "__mapping__") {
    const existingMapping =
      typeof targetConfig.mapping === "object" &&
      targetConfig.mapping !== null &&
      !Array.isArray(targetConfig.mapping)
        ? (targetConfig.mapping as Record<string, string>)
        : {};

    return {
      config: {
        ...targetConfig,
        mapping: { ...existingMapping, "": dotPath },
      },
    };
  }

  // Standard string field: only populate if empty/absent
  const currentValue = targetConfig[inputField];
  if (currentValue !== "" && currentValue !== undefined) return null;

  return {
    config: {
      ...targetConfig,
      [inputField]: dotPath,
    },
  };
}
