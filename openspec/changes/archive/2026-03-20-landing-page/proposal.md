## Why

The root route (`/`) still shows the default Next.js boilerplate. Pipevals is launching as open-source and needs a landing page that communicates what the product does, who it's for, and how to get started — before users sign in.

## What Changes

- Replace `app/page.tsx` with a single-page marketing landing page
- New sections: hero (quote-driven), problem cards, how it works (Build → Run → Measure), seed templates showcase, footer
- Separate design system from the app — different fonts (Plus Jakarta Sans + JetBrains Mono), electric blue accent, dark dot-grid background, sticky-note cards
- Tone: calm, confident, slightly jovial — not aggressive
- Demo video placeholders in the "How it works" steps (to be added later)
- CTA links to GitHub (https://github.com/pipevals) for "Get Started"

## Capabilities

### New Capabilities

- `landing-page`: Single-page marketing homepage at `/` with hero, problem cards, how-it-works steps, template showcase, and footer. Separate visual identity from the authenticated app.

### Modified Capabilities

_None — no existing spec behavior changes._

## Impact

- `app/page.tsx` — full rewrite (currently boilerplate)
- No changes to authenticated app routes, API, database, or dependencies
- New CSS scoped to the landing page (does not affect app design tokens)
