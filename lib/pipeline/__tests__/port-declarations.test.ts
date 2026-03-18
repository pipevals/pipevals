import { describe, expect, test } from "bun:test";
import type {
  InputPort,
  OutputPort,
  StepDefinition,
  StepInput,
} from "../types";

describe("Port declaration types", () => {
  test("scalar input port is well-typed", () => {
    const port: InputPort = {
      configField: "promptTemplate",
      mode: "scalar",
    };
    expect(port.mode).toBe("scalar");
    expect(port.configField).toBe("promptTemplate");
  });

  test("scalar input port with valueSuffix", () => {
    const port: InputPort = {
      configField: "expression",
      mode: "scalar",
      valueSuffix: " != null",
    };
    expect(port.mode).toBe("scalar");
    expect((port as { valueSuffix?: string }).valueSuffix).toBe(" != null");
  });

  test("additive input port is well-typed", () => {
    const port: InputPort = {
      configField: "metrics",
      mode: "additive",
    };
    expect(port.mode).toBe("additive");
  });

  test("template input port accepts generate function", () => {
    const port: InputPort = {
      configField: "code",
      mode: "template",
      generate: (dotPath, config) => {
        const isPython = config.runtime === "python";
        return isPython ? `return input["${dotPath}"]` : `return input["${dotPath}"];`;
      },
    };
    expect(port.mode).toBe("template");
    expect(
      (port as { generate: (d: string, c: Record<string, unknown>) => string }).generate(
        "steps.llm.text",
        { runtime: "node" },
      ),
    ).toBe('return input["steps.llm.text"];');
  });

  test("output port is well-typed", () => {
    const port: OutputPort = { key: "text" };
    expect(port.key).toBe("text");
  });

  test("StepDefinition combines handler and ports", () => {
    const def: StepDefinition = {
      handler: async (_config: Record<string, unknown>, _input: StepInput) => ({
        text: "hello",
      }),
      ports: {
        inputs: [{ configField: "promptTemplate", mode: "scalar" }],
        outputs: [{ key: "text" }],
      },
    };
    expect(def.ports.inputs).toHaveLength(1);
    expect(def.ports.outputs).toHaveLength(1);
    expect(typeof def.handler).toBe("function");
  });

  test("StepDefinition with empty outputs (not auto-wireable as source)", () => {
    const def: StepDefinition = {
      handler: async () => ({ branch: "true" }),
      ports: {
        inputs: [{ configField: "expression", mode: "scalar", valueSuffix: " != null" }],
        outputs: [],
      },
    };
    expect(def.ports.outputs).toHaveLength(0);
  });
});
