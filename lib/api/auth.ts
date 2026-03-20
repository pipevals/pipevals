import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema";
import {
  pipelines,
  pipelineNodes,
  pipelineEdges,
  datasets,
} from "@/lib/db/pipeline-schema";
import { headers } from "next/headers";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

type AuthError = { error: NextResponse };
type AuthSuccessBase = {
  session: Awaited<ReturnType<typeof auth.api.getSession>> & {};
  userId: string;
  organizationId: string;
};
type AuthSuccessFull = AuthSuccessBase & {
  role: string;
};
type AuthSuccess = AuthSuccessBase | AuthSuccessFull;

/** Result from API key verification — no session, org inferred later. */
type ApiKeyAuthResult = {
  fromApiKey: true;
  userId: string;
  organizationId: null;
};

/** Pipeline result when authenticated via API key — no session object. */
type ApiKeyPipelineResult<P> = {
  fromApiKey: true;
  userId: string;
  organizationId: string;
  role: string;
  pipeline: P;
};

type AuthOptions = { write?: boolean; withRole?: boolean; apiKey?: boolean };

/**
 * Attempts API key authentication. Returns the verified userId or null.
 */
async function verifyApiKey(reqHeaders: Headers): Promise<ApiKeyAuthResult | null> {
  const apiKeyHeader = reqHeaders.get("x-api-key");
  if (!apiKeyHeader) return null;

  const result = await auth.api.verifyApiKey({
    body: { key: apiKeyHeader },
  });

  if (!result.valid || !result.key) return null;

  return { fromApiKey: true, userId: result.key.referenceId, organizationId: null };
}

/**
 * Gets the authenticated session with an active organization.
 *
 * Without options: fast path — session + org check only, no DB query.
 * With `{ write: true }`: queries member table, blocks guests with 403.
 * With `{ withRole: true }`: queries member table, returns role.
 * With `{ apiKey: true }`: also accepts x-api-key header (org inferred later by caller).
 */
export async function requireAuth(): Promise<AuthError | AuthSuccessBase>;
export async function requireAuth(options: AuthOptions & { apiKey: true }): Promise<AuthError | AuthSuccessFull | ApiKeyAuthResult>;
export async function requireAuth(options: AuthOptions): Promise<AuthError | AuthSuccessFull>;
export async function requireAuth(
  options?: AuthOptions,
): Promise<AuthError | AuthSuccess | ApiKeyAuthResult> {
  const reqHeaders = await headers();

  // API key path: verify key, return userId (org inferred later by caller)
  if (options?.apiKey) {
    const apiKeyResult = await verifyApiKey(reqHeaders);
    if (apiKeyResult) return apiKeyResult;
    // Fall through to cookie auth if no x-api-key header present
  }

  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    return {
      error: NextResponse.json(
        { error: "No active organization. Set one first." },
        { status: 403 },
      ),
    };
  }

  const base: AuthSuccessBase = { session, userId: session.user.id, organizationId };

  if (!options) return base;

  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
  });

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: "Not a member of this organization" },
        { status: 403 },
      ),
    };
  }

  if (options.write && membership.role === "guest") {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return { ...base, role: membership.role };
}

/**
 * Page-level auth: returns session + organizationId or redirects to sign-in.
 * Handles auto-invite for demo orgs.
 */
export async function requireSessionWithOrg() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/sign-in");

  let organizationId = session.session.activeOrganizationId;

  if (!organizationId && isAutoInviteEnabled()) {
    const anyMembership = await db.query.member.findFirst({
      where: eq(member.userId, session.user.id),
    });
    if (!anyMembership) redirect("/sign-in");

    organizationId = anyMembership.organizationId;
    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId },
    });
  }

  if (!organizationId) redirect("/sign-in");

  const membership = await db.query.member.findFirst({
    where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
  });
  if (!membership) redirect("/sign-in");

  return { session, user: session.user, organizationId, role: membership.role };
}

type PipelineRow = typeof pipelines.$inferSelect;
type NodeRow = typeof pipelineNodes.$inferSelect;
type EdgeRow = typeof pipelineEdges.$inferSelect;

type PipelineWithGraph = PipelineRow & { nodes: NodeRow[]; edges: EdgeRow[] };
type PipelineOptions = { withGraph?: boolean; write?: boolean; withRole?: boolean; apiKey?: boolean };

/**
 * Auth + pipeline ownership check. Returns 401/403/404 or the pipeline
 * scoped to the user's active organization.
 * Pass `{ withGraph: true }` to include nodes and edges.
 * Pass `{ write: true }` to block guest users.
 * Pass `{ withRole: true }` to include role in the result.
 * Also accepts `true` as shorthand for `{ withGraph: true }` (backward compat).
 */
// Overloads with `apiKey: true` include ApiKeyPipelineResult (no session).
// Overloads without it return session-based results only.
// TS resolves top-to-bottom, so `options: true` (backward-compat shorthand)
// skips the first overload (requires object with apiKey: true) and matches the second.
export async function requirePipeline(
  pipelineId: string,
  options: { withGraph: true; write?: boolean; withRole?: boolean; apiKey: true },
): Promise<AuthError | (AuthSuccessFull & { pipeline: PipelineWithGraph }) | ApiKeyPipelineResult<PipelineWithGraph>>;
export async function requirePipeline(
  pipelineId: string,
  options: true | { withGraph: true; write?: boolean; withRole?: boolean; apiKey?: false },
): Promise<AuthError | (AuthSuccessFull & { pipeline: PipelineWithGraph })>;
export async function requirePipeline(
  pipelineId: string,
  options: { withGraph?: false; write?: boolean; withRole: true; apiKey: true },
): Promise<AuthError | (AuthSuccessFull & { pipeline: PipelineRow }) | ApiKeyPipelineResult<PipelineRow>>;
export async function requirePipeline(
  pipelineId: string,
  options: { withGraph?: false; write?: boolean; withRole: true; apiKey?: false },
): Promise<AuthError | (AuthSuccessFull & { pipeline: PipelineRow })>;
export async function requirePipeline(
  pipelineId: string,
  options?: false | { withGraph?: false; write?: boolean; withRole?: false; apiKey?: false },
): Promise<AuthError | (AuthSuccessBase & { pipeline: PipelineRow })>;
export async function requirePipeline(
  pipelineId: string,
  options?: boolean | PipelineOptions,
): Promise<AuthError | (AuthSuccess & { pipeline: PipelineRow | PipelineWithGraph }) | ApiKeyPipelineResult<PipelineRow | PipelineWithGraph>> {
  const opts: PipelineOptions =
    typeof options === "boolean" ? { withGraph: options } : options ?? {};

  const needsMember = opts.write || opts.withRole;
  const authResult = opts.apiKey
    ? await requireAuth({ write: opts.write, withRole: opts.withRole, apiKey: true })
    : needsMember
      ? await requireAuth({ write: opts.write, withRole: opts.withRole })
      : await requireAuth();
  if ("error" in authResult) return authResult;

  // API key path: look up pipeline by ID, then verify membership in its org.
  if ("fromApiKey" in authResult) {
    const pipeline = opts.withGraph
      ? await db.query.pipelines.findFirst({
          where: eq(pipelines.id, pipelineId),
          with: { nodes: true, edges: true },
        })
      : await db.query.pipelines.findFirst({
          where: eq(pipelines.id, pipelineId),
        });

    if (!pipeline) {
      return {
        error: NextResponse.json({ error: "Pipeline not found" }, { status: 404 }),
      };
    }

    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, authResult.userId),
        eq(member.organizationId, pipeline.organizationId),
      ),
    });

    if (!membership) {
      return {
        error: NextResponse.json({ error: "Pipeline not found" }, { status: 404 }),
      };
    }

    if (opts.write && membership.role === "guest") {
      return {
        error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
      };
    }

    return {
      fromApiKey: true as const,
      userId: authResult.userId,
      organizationId: pipeline.organizationId,
      role: membership.role,
      pipeline,
    };
  }

  // Cookie path: pipeline scoped to active org.
  const where = and(
    eq(pipelines.id, pipelineId),
    eq(pipelines.organizationId, authResult.organizationId),
  );

  const pipeline = opts.withGraph
    ? await db.query.pipelines.findFirst({ where, with: { nodes: true, edges: true } })
    : await db.query.pipelines.findFirst({ where });

  if (!pipeline) {
    return {
      error: NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      ),
    };
  }

  return { ...authResult, pipeline };
}

type DatasetRow = typeof datasets.$inferSelect;

/**
 * Auth + dataset ownership check. Returns 401/403/404 or the dataset
 * scoped to the user's active organization.
 * Pass `{ write: true }` to block guest users.
 */
export async function requireDataset(
  datasetId: string,
  options?: AuthOptions,
): Promise<AuthError | (AuthSuccess & { dataset: DatasetRow })> {
  const authResult = options?.write
    ? await requireAuth({ write: true })
    : await requireAuth();
  if ("error" in authResult) return authResult;

  const where = and(
    eq(datasets.id, datasetId),
    eq(datasets.organizationId, authResult.organizationId),
  );

  const dataset = await db.query.datasets.findFirst({ where });

  if (!dataset) {
    return {
      error: NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 },
      ),
    };
  }

  return { ...authResult, dataset };
}
