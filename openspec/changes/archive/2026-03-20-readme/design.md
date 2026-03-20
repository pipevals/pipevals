## Context

The repository README is the default create-next-app boilerplate. Pipevals is preparing for open-source launch and needs a README that communicates the product to developers.

From the explore session, we established:
- Target audience: open-source developers
- 4 active step types at launch: AI SDK, Transform, Metric Capture, Human Review
- 3 disabled step types (not mentioned): API Request, Sandbox, Condition
- Getting started: just `bun` + seed
- GIF placeholder for visual demo (added later)
- MIT license

## Goals / Non-Goals

**Goals:**
- Communicate what pipevals is in one paragraph
- Highlight the 7 feature pillars with concise descriptions
- Provide a working Getting Started flow (clone → run in <2 minutes)
- List the tech stack
- Reference MIT license

**Non-Goals:**
- Contributing guide (separate CONTRIBUTING.md later)
- API documentation
- Architecture deep-dive
- Deployment/production setup instructions

## Decisions

### README structure

```
# Pipevals
Pitch paragraph

[GIF placeholder]

## Features
7 pillars, each 2-3 sentences

## Getting Started
Prerequisites → env → install → seed → run

## Tech Stack
One-line list

## License
MIT
```

**Why this order:** Features before Getting Started because the README needs to sell "why should I care" before "how do I set it up". Tech stack at the bottom for reference — people who need it will scroll.

### Feature framing: 4 step types, not 7

Only mention the 4 launch-ready step types (AI SDK, Transform, Metric Capture, Human Review). The 3 disabled types (API Request, Sandbox, Condition) are omitted entirely — no "coming soon" or roadmap hints.

**Why:** Simpler story. Only describe what works today.

### Getting Started uses seed workflow

The setup flow uses `bun run db:seed` which creates a demo org, demo user (`demo@pipe.evals` / `pipevals-dev`), seed pipelines (AI-as-a-Judge, Model A/B), and demo datasets. This gives users a populated environment immediately.

**Prerequisites:** Node.js, Bun, PostgreSQL, AI Gateway API key.

## Risks / Trade-offs

- **GIF placeholder looks incomplete** → Acceptable short-term; the text content stands on its own
- **Seed credentials in README** → These are dev-only defaults, clearly labeled as such
- **AI Gateway dependency for getting started** → Required for AI SDK steps to work; documented as prerequisite
