# Pipevals

Build LLM evaluation pipelines visually. Connect model calls, human scoring, data transforms, and automated metrics into composable graphs — then run them against datasets to track quality over time.

### Build

https://github.com/user-attachments/assets/94e5cba8-5753-4f19-a707-70eb16690963

### Run

https://github.com/user-attachments/assets/eb034608-dcf0-48c7-9698-da702b27c123

### Measure

https://github.com/user-attachments/assets/c11afaf2-c54b-439d-a2fb-a2fa7e0d0d6c

## Features

### Visual Pipeline Builder

Drag-and-drop canvas for composing evaluation graphs. Connect typed step nodes with edges, define trigger input schemas, and let auto-wiring handle the plumbing between steps.

### Composable Step Types

Four built-in step types that cover the full evaluation loop:

- **AI SDK** — Call 100+ models across providers (Anthropic, OpenAI, Google, and more) through the Vercel AI Gateway. Supports structured responses for rubric-based judging.
- **Transform** — Reshape and map data between steps. Merge outputs from parallel branches, extract fields, or restructure payloads.
- **Metric Capture** — Record named metrics from upstream step outputs. Captured values feed into dashboards and aggregate stats across eval runs.
- **Human Review** — Pause pipeline execution and queue rubric-based scoring tasks for human reviewers. Supports rating scales, boolean, text, and select fields with multi-reviewer aggregation.

### Durable Execution

Pipelines run on Vercel Workflow with graph snapshots taken at trigger time. Steps execute in topological order with parallel branches where possible. Human review steps suspend execution via workflow hooks and resume automatically when all reviews are submitted.

### Datasets & Eval Runs

Create structured datasets with typed schemas and batch-execute pipelines against every item. Schema validation ensures dataset fields match pipeline trigger inputs. Track per-item results and aggregate metrics across the full run.

### Human-in-the-Loop Review

Pause pipelines at review steps with configurable rubrics — rating scales, boolean toggles, free text, or dropdowns. Assign multiple reviewers per step, view submitted scores alongside the review form, and resume execution automatically when all reviews are in. Scores are aggregated as means and fed into metrics.

### Metrics Dashboard

Track evaluation quality over time with trend charts, score distributions, step duration breakdowns, and pass rates. View metrics per-run or aggregated across eval runs. Drill into individual runs from the dashboard.

### Templates

Start from pre-built pipeline patterns or save your own. Ships with two seed templates:

- **AI-as-a-Judge** — Generate a response, score it with a judge model, capture metrics.
- **Model A/B Comparison** — Run two models in parallel, merge responses, judge both, capture comparative scores.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL
- [Vercel AI Gateway](https://vercel.com/ai-gateway) API key (for real runs)

### Setup

```bash
git clone https://github.com/pipevals/pipevals.git
cd pipevals
cp .env.example .env
```

Fill in your `.env`:

```bash
DATABASE_URL=postgresql://...
AI_GATEWAY_API_KEY=your-key
BETTER_AUTH_SECRET=   # openssl rand -base64 32
```

### Install, migrate, seed, and run

```bash
bun install
bun run db:push
bun run db:seed
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `demo@pipe.evals` / `pipevals-dev`.

## Specs

This project's specifications were built with [OpenSpec](https://openspec.dev).

## Tech Stack

Next.js 16 · React 19 · Vercel Workflow · xyflow · AI SDK · Zustand · Better Auth · Drizzle · PostgreSQL · shadcn/ui · Tailwind CSS

## License

[MIT](LICENSE)
