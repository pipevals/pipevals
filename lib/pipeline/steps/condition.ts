import type { ConditionConfig, StepHandler } from "../types";
import { resolveDotPath } from "@pipevals/workflow-walker";

type ComparisonOp = "==" | "!=" | ">" | "<" | ">=" | "<=";

const OPERATORS: ComparisonOp[] = ["!=", ">=", "<=", "==", ">", "<"];

function parseExpression(expression: string): {
  left: string;
  op: ComparisonOp;
  right: string;
} {
  for (const op of OPERATORS) {
    const idx = expression.indexOf(op);
    if (idx !== -1) {
      return {
        left: expression.slice(0, idx).trim(),
        op,
        right: expression.slice(idx + op.length).trim(),
      };
    }
  }
  throw new Error(
    `Invalid condition expression: "${expression}". Must contain one of: ${OPERATORS.join(", ")}`,
  );
}

function resolveOperand(
  operand: string,
  context: Record<string, unknown>,
): unknown {
  if (operand.startsWith("steps.") || operand.startsWith("trigger.")) {
    return resolveDotPath(context, operand);
  }

  if (operand === "true") return true;
  if (operand === "false") return false;
  if (operand === "null") return null;

  if (
    (operand.startsWith('"') && operand.endsWith('"')) ||
    (operand.startsWith("'") && operand.endsWith("'"))
  ) {
    return operand.slice(1, -1);
  }

  const num = Number(operand);
  if (!Number.isNaN(num)) return num;

  return operand;
}

function compare(left: unknown, op: ComparisonOp, right: unknown): boolean {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return (left as number) > (right as number);
    case "<":
      return (left as number) < (right as number);
    case ">=":
      return (left as number) >= (right as number);
    case "<=":
      return (left as number) <= (right as number);
  }
}

export const conditionHandler: StepHandler<ConditionConfig> = async (
  config,
  input,
) => {
  "use step";
  const context = { steps: input.steps, trigger: input.trigger };
  const { left, op, right } = parseExpression(config.expression);

  const leftVal = resolveOperand(left, context);
  const rightVal = resolveOperand(right, context);

  const result = compare(leftVal, op, rightVal);
  const branch = result ? config.handles[0] : config.handles[1];

  return { branch };
};
