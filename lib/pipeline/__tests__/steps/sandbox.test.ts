import { describe, expect, test, mock } from "bun:test";
import type { SandboxConfig, StepInput } from "../../types";

const mockStdout = mock(() => '{"score": 0.9}\n');
const mockStderr = mock(() => "");
const mockRunCommand = mock(() =>
  Promise.resolve({
    exitCode: 0,
    stdout: mockStdout,
    stderr: mockStderr,
  }),
);
const mockWriteFiles = mock(() => Promise.resolve());
const mockStop = mock(() => Promise.resolve());

mock.module("@vercel/sandbox", () => ({
  Sandbox: {
    create: mock(() =>
      Promise.resolve({
        runCommand: mockRunCommand,
        writeFiles: mockWriteFiles,
        stop: mockStop,
      }),
    ),
  },
}));

const { sandboxHandler } = await import("../../steps/sandbox");

const emptyInput: StepInput = { steps: {}, trigger: {} };

describe("sandboxHandler", () => {
  test("successful node execution returns parsed output", async () => {
    mockStdout.mockReturnValue('{"score": 0.9}\n');
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      stdout: mockStdout,
      stderr: mockStderr,
    });

    const config: SandboxConfig = {
      type: "sandbox",
      runtime: "node",
      code: 'return { score: 0.9 };',
      timeout: 5000,
    };

    const result = await sandboxHandler(config, emptyInput);
    expect(result).toEqual({ score: 0.9 });
    expect(mockWriteFiles).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  test("non-zero exit code throws error", async () => {
    mockStderr.mockReturnValue("ReferenceError: x is not defined");
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      stdout: mockStdout,
      stderr: mockStderr,
    });

    const config: SandboxConfig = {
      type: "sandbox",
      runtime: "node",
      code: "return x;",
      timeout: 5000,
    };

    await expect(sandboxHandler(config, emptyInput)).rejects.toThrow(
      "Sandbox exited with code 1",
    );
  });

  test("scalar return value is wrapped in { value }", async () => {
    mockStdout.mockReturnValue("42\n");
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      stdout: mockStdout,
      stderr: mockStderr,
    });

    const config: SandboxConfig = {
      type: "sandbox",
      runtime: "node",
      code: "return 42;",
      timeout: 5000,
    };

    const result = await sandboxHandler(config, emptyInput);
    expect(result).toEqual({ value: 42 });
  });
});
