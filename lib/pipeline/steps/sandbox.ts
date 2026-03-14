import { Sandbox } from "@vercel/sandbox";
import type { SandboxConfig, StepHandler } from "../types";

export class SandboxTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Sandbox execution exceeded timeout of ${timeout}ms`);
    this.name = "SandboxTimeoutError";
  }
}

const RUNTIME_MAP = {
  node: "node24",
  python: "python3.13",
} as const;

export const sandboxHandler: StepHandler<SandboxConfig> = async (
  config,
  input,
) => {
  const runtime = RUNTIME_MAP[config.runtime];
  const sandbox = await Sandbox.create({
    runtime,
    timeout: config.timeout,
  });

  try {
    const inputJson = JSON.stringify({
      steps: input.steps,
      trigger: input.trigger,
    });

    if (config.runtime === "node") {
      const wrapper = [
        `const input = ${inputJson};`,
        `async function main() { ${config.code} }`,
        `main().then(r => console.log(JSON.stringify(r ?? null)))`,
        `  .catch(e => { console.error(e.message); process.exit(1); });`,
      ].join("\n");

      await sandbox.writeFiles([
        { path: "script.js", content: Buffer.from(wrapper) },
      ]);

      const result = await sandbox.runCommand("node", ["script.js"]);
      const stdout = await result.stdout();
      const stderr = await result.stderr();

      if (result.exitCode !== 0) {
        throw new Error(`Sandbox exited with code ${result.exitCode}: ${stderr}`);
      }

      const lastLine = stdout.trim().split("\n").pop() ?? "null";
      const parsed = JSON.parse(lastLine);
      return typeof parsed === "object" && parsed !== null
        ? parsed
        : { value: parsed };
    }

    await sandbox.writeFiles([
      { path: "input.json", content: Buffer.from(inputJson) },
    ]);

    const wrapper = [
      `import json, sys`,
      `with open("input.json") as f: input = json.load(f)`,
      ``,
      `async def main():`,
      ...config.code.split("\n").map((line) => `    ${line}`),
      ``,
      `import asyncio`,
      `result = asyncio.run(main())`,
      `print(json.dumps(result))`,
    ].join("\n");

    await sandbox.writeFiles([
      { path: "script.py", content: Buffer.from(wrapper) },
    ]);

    const result = await sandbox.runCommand("python3", ["script.py"]);
    const stdout = await result.stdout();
    const stderr = await result.stderr();

    if (result.exitCode !== 0) {
      throw new Error(`Sandbox exited with code ${result.exitCode}: ${stderr}`);
    }

    const lastLine = stdout.trim().split("\n").pop() ?? "null";
    const parsed = JSON.parse(lastLine);
    return typeof parsed === "object" && parsed !== null
      ? parsed
      : { value: parsed };
  } finally {
    await sandbox.stop().catch(() => {});
  }
};
