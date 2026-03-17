## ADDED Requirements

### Requirement: Semantic status color tokens
The system SHALL define three semantic color tokens for pipeline run status visualization. These tokens MUST be defined in `globals.css` under the `@theme inline` block and have both light and dark mode values:

- `--color-pass` — green, maps to `--pass` (`oklch(0.63 0.17 160)` light / `oklch(0.72 0.17 160)` dark)
- `--color-fail` — red, maps to `--destructive` (reuses the existing destructive token)
- `--color-running` — blue, maps to `--running` (`oklch(0.55 0.2 255)` light / `oklch(0.7 0.18 255)` dark)

All status indicator components (e.g. `StatusDot`) MUST reference these semantic tokens rather than hardcoding color values.

#### Scenario: Status dot colors
- **WHEN** a run step has status `completed`
- **THEN** its status indicator renders using `--color-pass` (green)

#### Scenario: Status dot colors — failure
- **WHEN** a run step has status `failed`
- **THEN** its status indicator renders using `--color-fail` (destructive red)

#### Scenario: Status dot colors — in progress
- **WHEN** a run step has status `running`
- **THEN** its status indicator renders using `--color-running` (blue) with a pulsing animation

#### Scenario: Tokens adapt to dark mode
- **WHEN** the user switches to dark mode
- **THEN** `--color-pass` and `--color-running` use their lighter dark-mode OKLCH values for sufficient contrast against dark backgrounds

### Requirement: Typography — Geist font stack
The system SHALL use Geist as the primary sans-serif font and Geist Mono as the monospace font. The Tailwind theme tokens MUST declare explicit font stacks with OS-level fallbacks:

- `--font-sans`: `"Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif`
- `--font-mono`: `"Geist Mono", "Geist Mono Fallback", ui-monospace, monospace`

Fonts MUST be loaded via `next/font/google` (or local) in the root layout and applied to the `<html>` element via CSS variables.

#### Scenario: Font renders correctly
- **WHEN** the app loads in a browser with Geist available
- **THEN** all body text renders in Geist and all code/mono values render in Geist Mono

#### Scenario: Font fallback
- **WHEN** Geist fails to load
- **THEN** the browser falls back to `ui-sans-serif` / `system-ui` for body text and `ui-monospace` for mono text
