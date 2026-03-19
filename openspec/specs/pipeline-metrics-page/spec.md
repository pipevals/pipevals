## ADDED Requirements

### Requirement: Metrics page route
The system SHALL serve a page at `/pipelines/:id/metrics` that displays aggregate metric visualizations for the pipeline. The page MUST fetch data from `GET /api/pipelines/:id/runs/metrics`. The page MUST require authentication and redirect unauthenticated users.

#### Scenario: Navigate to metrics page
- **WHEN** an authenticated user navigates to `/pipelines/:id/metrics`
- **THEN** the page loads and displays chart components populated with data from the metrics API

#### Scenario: Pipeline with no runs
- **WHEN** a user views the metrics page for a pipeline with no completed runs
- **THEN** the page displays an empty state indicating no metrics data is available

### Requirement: Stat cards
The page SHALL display a row of stat cards showing: total number of completed runs, pass rate (percentage of runs with status `completed` out of all runs), average value of the first numeric metric, and average run duration. Each stat card MUST show a label and a formatted value.

#### Scenario: Stat cards with data
- **WHEN** a pipeline has 47 completed runs, 4 failed runs, an average "score" of 7.2, and average duration of 4.8s
- **THEN** the stat cards show "47" (total runs), "92.2%" (pass rate), "7.2" (avg score), "4.8s" (avg duration)

### Requirement: Metric trends chart
The page SHALL display an area chart showing numeric metric values across runs. Each distinct numeric metric MUST be rendered as a separate series with its own color. The chart MUST include a tooltip showing values on hover and a legend for toggling series visibility.

#### Scenario: Multiple metrics plotted
- **WHEN** a pipeline has runs with metrics "relevance" and "coherence"
- **THEN** the area chart displays two series, each with a distinct color and legend entry

#### Scenario: Non-numeric metric values skipped
- **WHEN** a metric value is a string or null for a given run
- **THEN** that data point is omitted from the chart without breaking the series

### Requirement: X-axis toggle
The metric trends chart MUST support toggling the x-axis between "By run" (run index, 1-based) and "By time" (createdAt timestamp). The toggle MUST be a `ToggleGroup` control above the chart. The default MUST be "By run".

#### Scenario: Toggle to time-based axis
- **WHEN** a user selects "By time" on the toggle
- **THEN** the x-axis updates to show timestamps and data points are spaced by their actual creation time

#### Scenario: Toggle to run-based axis
- **WHEN** a user selects "By run" on the toggle
- **THEN** the x-axis updates to show sequential run indices with equal spacing

### Requirement: Score distribution chart
The page SHALL display a vertical bar chart showing the distribution of values for a selected metric. The user MUST be able to select which metric to display via a dropdown. Values MUST be bucketed into histogram bins.

#### Scenario: View score distribution
- **WHEN** a user selects the "score" metric from the dropdown
- **THEN** a bar chart displays the frequency distribution of "score" values across all runs

### Requirement: Step duration chart
The page SHALL display a horizontal bar chart showing the average duration of each pipeline step across all completed runs. Steps MUST be labeled by their node label. Steps MUST be ordered by average duration descending (slowest first).

#### Scenario: View step durations
- **WHEN** a pipeline has runs with steps "Generator" (avg 2.3s), "Judge" (avg 3.8s), "Metrics" (avg 0.1s)
- **THEN** the bar chart shows three horizontal bars ordered: Judge (3.8s), Generator (2.3s), Metrics (0.1s)

### Requirement: Recent runs table
The page SHALL display a table showing the most recent runs (up to 10) with their status, metric values inline, and duration. The table MUST include a "View all" link that navigates to the full runs list at `/pipelines/:id/runs`.

#### Scenario: Recent runs with inline metrics
- **WHEN** a pipeline has 25 runs with metrics "relevance" and "score"
- **THEN** the table shows the 10 most recent runs with columns: Run ID, Status, relevance, score, Duration, and a "View all" link
