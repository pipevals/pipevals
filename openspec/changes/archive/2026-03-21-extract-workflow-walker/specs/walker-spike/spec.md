## ADDED Requirements

### Requirement: Spike verifies SWC compilation of package directives

The spike SHALL create a minimal npm package containing a `createWalker()` factory function that returns a function with the `"use workflow"` directive. The spike SHALL create a minimal Next.js test app that installs the package, configures `withWorkflow()`, and calls `start()` on the factory-produced function.

The spike SHALL verify that the Next.js build succeeds and the Workflow SWC plugin correctly transforms the `"use workflow"` and `"use step"` directives found in the installed package.

#### Scenario: Build succeeds with directives in node_modules

- **WHEN** the test app runs `next build`
- **THEN** the build completes without errors related to unrecognized `"use workflow"` or `"use step"` directives

### Requirement: Spike verifies closure capture in "use step"

The spike SHALL include a `"use step"` function inside the workflow that calls an adapter method passed via the factory's closure scope. The spike SHALL verify that the adapter method is called correctly during step execution.

#### Scenario: Step function calls adapter via closure

- **WHEN** the workflow executes and reaches a `"use step"` function that calls `persistence.recordStepRunning(runId, nodeId)`
- **THEN** the adapter's `recordStepRunning` method is invoked with the correct arguments

#### Scenario: Step replays after crash with closure intact

- **WHEN** a workflow is restarted after a crash and a previously completed step is replayed
- **THEN** the step returns its cached result without re-invoking the adapter, and subsequent steps still have access to the adapter via closure

### Requirement: Spike verifies hook suspension from package

The spike SHALL include a `defineHook` call at the workflow level (inside the `"use workflow"` function) within the package. The spike SHALL verify that the workflow suspends when awaiting the hook and resumes when the hook is triggered externally.

#### Scenario: Workflow suspends on hook from package

- **WHEN** the workflow creates a hook via `defineHook().create()` and awaits it
- **THEN** the workflow suspends and does not proceed to subsequent steps

#### Scenario: Workflow resumes after external hook trigger

- **WHEN** the test app calls `resumeHook(token, payload)` for the suspended hook
- **THEN** the workflow resumes and the hook's resolved value is available to subsequent steps

### Requirement: Spike produces go/no-go decision

The spike SHALL document a clear go/no-go result for the full extraction. If any of the three verifications (SWC compilation, closure capture, hook suspension) fail, the spike SHALL document the failure mode and recommend a fallback approach.

#### Scenario: All verifications pass

- **WHEN** SWC compilation, closure capture, and hook suspension all work correctly
- **THEN** the spike produces a "go" decision and the full extraction can proceed

#### Scenario: Closure capture fails

- **WHEN** the `"use step"` function cannot access adapter methods via closure after SWC transformation
- **THEN** the spike produces a "no-go" for the factory pattern and recommends the fallback: passing adapters as explicit step arguments or using module-level configuration
