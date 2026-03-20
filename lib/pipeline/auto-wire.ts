import type { StepType, InputPort } from "./types";
import { portRegistry } from "./steps/ports";

export interface AutoWirePatch {
  config: Record<string, unknown>;
}

/**
 * Returns a config patch to apply to the target node when a new edge is drawn,
 * or null if no auto-wire is applicable.
 *
 * Reads port declarations from the step registry instead of hardcoded tables.
 */
export function autoWireInputs(
  sourceType: string,
  sourceSlug: string | null | undefined,
  sourceId: string,
  targetType: string,
  targetConfig: Record<string, unknown>,
  triggerSchema: Record<string, unknown>,
): AutoWirePatch | null {
  // 1. Resolve source dot-path from output port declarations
  const dotPath = resolveSourceDotPath(
    sourceType,
    sourceSlug,
    sourceId,
    triggerSchema,
  );
  if (dotPath === null) return null;

  // 2. Look up target's first input port
  const targetPorts = portRegistry[targetType as StepType];
  if (!targetPorts) return null;

  const inputPort = targetPorts.inputs[0];
  if (!inputPort) return null;

  // 3. Apply port mode
  return applyPort(inputPort, dotPath, targetConfig);
}

function resolveSourceDotPath(
  sourceType: string,
  sourceSlug: string | null | undefined,
  sourceId: string,
  triggerSchema: Record<string, unknown>,
): string | null {
  if (sourceType === "trigger") {
    const firstKey = Object.keys(triggerSchema)[0];
    return firstKey ? `trigger.${firstKey}` : "trigger";
  }

  const sourcePorts = portRegistry[sourceType as StepType];
  if (!sourcePorts) return null;

  const primaryOutput = sourcePorts.outputs[0];
  if (!primaryOutput) return null;

  const identifier = sourceSlug || sourceId;
  return `steps.${identifier}.${primaryOutput.key}`;
}

function applyPort(
  port: InputPort,
  dotPath: string,
  targetConfig: Record<string, unknown>,
): AutoWirePatch | null {
  switch (port.mode) {
    case "scalar": {
      const currentValue = targetConfig[port.configField];
      if (currentValue !== "" && currentValue !== undefined) return null;

      const value = port.valueSuffix ? `${dotPath}${port.valueSuffix}` : dotPath;
      return {
        config: { ...targetConfig, [port.configField]: value },
      };
    }

    case "additive": {
      const existing =
        typeof targetConfig[port.configField] === "object" &&
        targetConfig[port.configField] !== null &&
        !Array.isArray(targetConfig[port.configField])
          ? (targetConfig[port.configField] as Record<string, unknown>)
          : {};

      return {
        config: {
          ...targetConfig,
          [port.configField]: { ...existing, "": dotPath },
        },
      };
    }

    case "template": {
      const currentValue = targetConfig[port.configField];
      if (currentValue !== "" && currentValue !== undefined) return null;

      const generated = port.generate(dotPath, targetConfig);
      return {
        config: { ...targetConfig, [port.configField]: generated },
      };
    }

    default: {
      const _exhaustive: never = port;
      return _exhaustive;
    }
  }
}
