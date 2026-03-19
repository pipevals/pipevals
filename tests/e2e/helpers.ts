import { execSync, execFileSync } from "child_process";
import { seedPipelineDefinitions } from "../../lib/db/seed-templates";

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

/**
 * Connection mode for agent-browser:
 *
 * - E2E_CDP=9222         → connect to existing Chrome via --cdp 9222
 *                           (reuses your signed-in session)
 * - E2E_AUTO_CONNECT=1   → use --auto-connect to find running Chrome
 * - (neither)            → use --profile for a standalone browser instance
 *
 * For GitHub OAuth, use CDP or auto-connect with a Chrome where you're
 * already signed in. Launch Chrome with remote debugging:
 *
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 */
function browserFlag(): string {
  if (process.env.E2E_CDP) return `--cdp ${process.env.E2E_CDP}`;
  if (process.env.E2E_AUTO_CONNECT) return "--auto-connect";
  return `--profile ${process.env.E2E_PROFILE ?? "~/.pipevals-e2e"}`;
}

const BROWSER_FLAG = browserFlag();

// Pipeline names from seed definitions — if these change, tests stay in sync.
const judge = seedPipelineDefinitions.find(
  (d) => d.slug === "ai-as-a-judge-scoring",
);
const ab = seedPipelineDefinitions.find(
  (d) => d.slug === "model-ab-comparison",
);

if (!judge || !ab) {
  throw new Error(
    "Seed pipeline definitions not found — has seed-pipelines.ts changed?",
  );
}

export const JUDGE_PIPELINE_NAME = judge.name;
export const AB_PIPELINE_NAME = ab.name;

/**
 * Run an agent-browser command and return stdout.
 * Throws on non-zero exit code.
 */
export function ab_run(command: string): string {
  return execSync(`agent-browser ${BROWSER_FLAG} ${command}`, {
    encoding: "utf-8",
    timeout: 30_000,
  }).trim();
}

/**
 * Run an agent-browser command silently (ignore output).
 */
export function ab_exec(command: string): void {
  execSync(`agent-browser ${BROWSER_FLAG} ${command}`, {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: "pipe",
  });
}

/**
 * Get the accessibility snapshot (interactive elements only).
 */
export function snapshot(): string {
  return ab_run("snapshot -i");
}

/**
 * Get the full accessibility snapshot (all elements, including static text).
 * Use this when you need to find non-interactive content like node labels.
 */
export function fullSnapshot(): string {
  return ab_run("snapshot");
}

/**
 * Sign in via the Better Auth email/password API and inject the session
 * cookie into agent-browser. Only works in dev (emailAndPassword enabled).
 *
 * Uses the seeded demo user by default.
 */
export async function signInDev(
  email = "demo@pipe.evals",
  password = "pipevals-dev",
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  if (!res.ok && res.status !== 302) {
    throw new Error(`Dev sign-in failed: ${res.status} ${await res.text()}`);
  }

  // Extract set-cookie header and inject into the browser.
  // Uses execFileSync (no shell) to avoid command injection from cookie values.
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookie) {
    const [nameValue] = cookie.split(";");
    const [name, value] = nameValue.split("=");
    const safeName = name.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const safeValue = value.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const js = `document.cookie='${safeName}=${safeValue}; path=/'`;
    execFileSync("agent-browser", [...BROWSER_FLAG.split(" "), "eval", js], {
      encoding: "utf-8",
      timeout: 10_000,
      stdio: "pipe",
    });
  }
}

/**
 * Navigate to a URL. If redirected to sign-in, authenticate via dev
 * email/password and retry.
 */
export async function navigateAuthenticated(path: string): Promise<void> {
  ab_exec(`open ${BASE_URL}${path}`);
  ab_exec("wait --load networkidle");

  const snap = snapshot();
  if (snap.includes("Sign in to Pipevals")) {
    console.log("  → Signing in via dev auth...");
    await signInDev();
    ab_exec(`open ${BASE_URL}${path}`);
    ab_exec("wait --load networkidle");
  }
}

/**
 * Ensure a pipeline exists in the list. If not, creates it from a template.
 * Works from both the empty state (template cards visible) and the populated
 * list (uses "New Pipeline" button to open the template picker).
 *
 * Must be called after navigateAuthenticated("/pipelines").
 * Returns the updated interactive snapshot.
 */
export function ensurePipeline(pipelineName: string): string {
  let snap = snapshot();
  if (snap.includes(pipelineName)) return snap;

  console.log(`  → "${pipelineName}" not found, creating from template...`);

  // If the empty state is showing, the template card is already visible.
  // Otherwise, click "New Pipeline" to open the creation form with the picker.
  if (!snap.includes("No pipelines yet")) {
    ab_exec('find text "New Pipeline" click');
    ab_exec("wait 500");
  }

  // Click the template card
  ab_exec(`find text "${pipelineName}" click`);
  ab_exec("wait 1000");

  // Verify the creation form opened
  const formSnap = snapshot();
  assert(
    formSnap.includes("Create"),
    `Creation form opened after clicking "${pipelineName}" template`,
  );

  ab_exec('find text "Create" click');
  ab_exec("wait --load networkidle");
  ab_exec("wait 1000");

  snap = snapshot();
  assert(snap.includes(pipelineName), `"${pipelineName}" pipeline created from template`);
  return snap;
}

/**
 * Extract a pipeline ID from the page using the data-pipeline-id attribute.
 * Evaluates JS in the browser to read it.
 */
export function getPipelineId(pipelineName: string): string {
  const id = ab_run(
    `eval "document.querySelector('[data-pipeline-id]')?.getAttribute('data-pipeline-id') ?? ''"`,
  );
  assert(!!id, `Pipeline ID found for "${pipelineName}"`);
  return id;
}

/**
 * Assert a condition, logging and exiting on failure.
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

export function pass(testName: string): void {
  console.log(`PASS: ${testName}`);
}
