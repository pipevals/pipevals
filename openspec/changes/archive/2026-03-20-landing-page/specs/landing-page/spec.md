## ADDED Requirements

### Requirement: Navigation bar

The landing page SHALL display a fixed navigation bar at the top with the "Pipevals" wordmark on the left and "GitHub" and "Sign In" links on the right.

#### Scenario: Navigation links

- **WHEN** the landing page loads
- **THEN** the nav bar displays "Pipevals" as a wordmark, a "GitHub" link pointing to `https://github.com/pipevals`, and a "Sign In" link pointing to `/sign-in`

### Requirement: Hero section with authority quote

The hero section SHALL display a quote as the primary headline, followed by a positioning subheadline and a three-beat description line.

#### Scenario: Hero content

- **WHEN** the landing page loads
- **THEN** the hero displays a quote, followed by "Pipevals is the visual pipeline builder for evaluation-driven AI development." and "Build evaluation graphs. Run them against datasets. Track quality over time."

#### Scenario: Call to action

- **WHEN** the user views the hero section
- **THEN** a "Get Started" button links to `https://github.com/pipevals`

### Requirement: Problem cards

The landing page SHALL display three problem cards in a horizontal row, each highlighting a distinct pain point that pipevals solves.

#### Scenario: Three problem cards displayed

- **WHEN** the landing page loads
- **THEN** three cards are visible with titles "The Vibe Check", "The Compound Error", and "The Eval Gap"

#### Scenario: The Vibe Check card content

- **WHEN** the user views the first problem card
- **THEN** it displays: "Most teams evaluate AI by eyeballing results. It works until it doesn't — and you won't know when it stops working."

#### Scenario: The Compound Error card content

- **WHEN** the user views the second problem card
- **THEN** it displays: "95% accuracy per step sounds great. Over 10 steps, that's 60% accuracy overall. The pipeline is only as good as its weakest link."

#### Scenario: The Eval Gap card content

- **WHEN** the user views the third problem card
- **THEN** it displays: "Everyone agrees you need evaluation pipelines. Somehow, you're still expected to build them from scratch."

### Requirement: How it works section

The landing page SHALL display a "Build. Run. Measure." section with three steps explaining the product workflow.

#### Scenario: Build step

- **WHEN** the user views the How It Works section
- **THEN** a "Build" step is displayed with text: "Drag steps onto a canvas and wire them together. Call models, reshape data, capture scores, or pause for human review — all without writing orchestration code."

#### Scenario: Run step

- **WHEN** the user views the How It Works section
- **THEN** a "Run" step is displayed with text: "Trigger pipelines one at a time or batch them against a dataset. Each item runs through the full graph, durably, with step-by-step results you can inspect after."

#### Scenario: Measure step

- **WHEN** the user views the How It Works section
- **THEN** a "Measure" step is displayed with text: "See where quality stands and where it's headed. Trend charts, score distributions, step durations, and pass rates — all populated automatically from your pipeline runs."

#### Scenario: Demo video placeholders

- **WHEN** the landing page renders
- **THEN** each step in the How It Works section SHALL include a placeholder area for a demo video

### Requirement: Templates showcase

The landing page SHALL display the two seed pipeline templates with their graph structures and descriptions.

#### Scenario: AI-as-a-Judge template

- **WHEN** the user views the templates section
- **THEN** a card for "AI-as-a-Judge" is displayed showing the pipeline flow (Trigger → Generator → Judge → Metrics) and the description "Score any model's output with an LLM judge."

#### Scenario: Model A/B Comparison template

- **WHEN** the user views the templates section
- **THEN** a card for "Model A/B Comparison" is displayed showing the pipeline flow (Trigger → Model A / Model B → Collect Responses → Judge → Metrics) and the description "Compare two models head to head."

#### Scenario: Save as template mention

- **WHEN** the user views the templates section
- **THEN** text below the template cards states "Or save any pipeline as a reusable template for your team."

### Requirement: Footer

The landing page SHALL display a minimal footer with project links.

#### Scenario: Footer content

- **WHEN** the landing page loads
- **THEN** the footer displays links/text for: "Pipevals", "MIT License", "GitHub", and "Built with OpenSpec"

### Requirement: Separate visual identity

The landing page SHALL use a distinct visual identity from the authenticated app, scoped to the landing page only.

#### Scenario: Landing page typography

- **WHEN** the landing page renders
- **THEN** headlines use Plus Jakarta Sans and body text uses JetBrains Mono, loaded via `next/font/google`

#### Scenario: Landing page color scheme

- **WHEN** the landing page renders
- **THEN** the page uses a dark background with a dot-grid pattern and electric blue (`#00F0FF`) as the accent color

#### Scenario: Problem card styling

- **WHEN** the landing page renders
- **THEN** problem cards use pastel background colors (blue, yellow, green) with slight rotation and hover effects in a sticky-note style

#### Scenario: App design tokens unaffected

- **WHEN** authenticated app routes render (e.g., `/pipelines`)
- **THEN** they continue to use Geist fonts, shadcn/ui tokens, and existing color variables without any changes
