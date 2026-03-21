# Credits Page

## Summary

Add a dedicated `/credits` route that presents all project dependencies as cinematic film-style rolling credits, ranked by architectural role. Two variants: a CSS-only rolling credits view (with clickable npm links) and a Remotion-powered cinematic version (with scene-based transitions). Both share audio and a playful, self-aware tone.

## Motivation

A fun, creative way to acknowledge the open-source ecosystem that powers Pipevals. Also serves as a unique differentiator for the landing site.

## Scope

- New `/credits` route
- Static credits data (hand-crafted, not generated)
- CSS rolling credits variant with clickable dependency links
- Remotion Player variant with scene-based composition (lazy-loaded)
- Ambient audio with mute toggle
- Closing card: "Built by Gianluca Esposito"
- Matches existing dark theme (#0a0a0a, cyan #00F0FF accents, JetBrains Mono + Plus Jakarta Sans)

## Out of Scope

- Pre-rendered video export (can use Remotion CLI later)
- Dynamic credits from package.json (static/hand-crafted)
- Audio file sourcing (placeholder path, user provides file)
