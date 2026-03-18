## ADDED Requirements

### Requirement: E2E test infrastructure
The system SHALL include E2E smoke tests in a `tests/e2e/` directory that use browser automation to verify the product works end-to-end. Tests SHALL assume the dev server is running and seed pipelines have been inserted.

#### Scenario: Test directory structure
- **WHEN** the E2E test suite is inspected
- **THEN** test files SHALL exist at `tests/e2e/` with clear names indicating what flow they test

### Requirement: Pipeline list smoke test
An E2E test SHALL verify that seed pipelines appear in the pipeline list view after sign-in.

#### Scenario: Seed pipelines visible in list
- **WHEN** a user navigates to the pipelines page after signing in
- **THEN** "AI-as-a-Judge Scoring" and "Model A/B Comparison" SHALL both appear in the pipeline list

### Requirement: Pipeline canvas render smoke test
An E2E test SHALL verify that opening a seed pipeline renders its nodes on the xyflow canvas.

#### Scenario: AI-as-a-Judge canvas renders correctly
- **WHEN** a user opens the "AI-as-a-Judge Scoring" pipeline
- **THEN** the canvas SHALL display nodes labeled "Generator", "Judge", and a trigger node, connected by edges

#### Scenario: Model A/B Comparison canvas renders correctly
- **WHEN** a user opens the "Model A/B Comparison" pipeline
- **THEN** the canvas SHALL display nodes labeled "Model A", "Model B", "Judge", "Collect Responses", and a trigger node, with the fork-converge layout visible

### Requirement: Pipeline run trigger smoke test
An E2E test SHALL verify that a pipeline run can be triggered from the UI and that the run appears in the run list.

#### Scenario: Trigger a run from the UI
- **WHEN** a user opens a seed pipeline, fills in the trigger input with a test prompt, and clicks the run button
- **THEN** a new run SHALL appear in the run list with status "pending" or "running"

### Requirement: E2E test prerequisites documentation
The E2E test directory SHALL include a README or header comments documenting prerequisites: dev server URL, seed script must have been run, auth credentials or session setup required.

#### Scenario: Prerequisites are documented
- **WHEN** a developer reads the E2E test files
- **THEN** instructions for running prerequisites (seed script, dev server, auth) SHALL be clearly stated
