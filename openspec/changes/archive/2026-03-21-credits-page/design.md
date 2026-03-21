# Credits Page — Design

## Architecture

```
app/credits/
├── page.tsx                  ← Route, landing state, variant toggle
├── credits-data.ts           ← Static credits tiers (shared by both variants)
├── css-credits.tsx           ← CSS rolling credits component
└── remotion/
    ├── CreditComposition.tsx ← Root Remotion composition
    ├── scenes/
    │   ├── TitleScene.tsx    ← Opening "PIPEVALS" card
    │   ├── TierScene.tsx     ← Reusable per-tier scene
    │   └── ClosingScene.tsx  ← "Built by Gianluca Esposito" + quips
    └── RemotionPlayer.tsx    ← Wrapper loaded via next/dynamic (ssr: false)

public/credits/
└── soundtrack.mp3            ← Royalty-free ambient track (user-provided)
```

## Credits Hierarchy (by Architectural Role)

### Tier 1 — STARRING (framework foundation)
- React 19 — "The Runtime"
- Next.js 16 — "The Framework"

### Tier 2 — CO-STARRING (core business logic)
- Drizzle ORM — "The Data Layer"
- Workflow — "The Orchestrator"
- Better Auth — "The Gatekeeper"
- Vercel AI SDK — "The Intelligence"

### Tier 3 — FEATURING (major UI & interaction)
- React Flow — "The Canvas"
- Radix UI — "The Primitives"
- Recharts — "The Analyst"
- Zustand — "The State Manager"
- SWR — "The Data Fetcher"

### Tier 4 — SUPPORTING CAST (utilities)
- Zod — "The Validator"
- Hugeicons — "The Iconographer"
- Sonner — "The Messenger"
- cmdk — "The Command Palette"
- Luxon — "The Timekeeper"

### Tier 5 — CREW (styling & DX)
- Tailwind CSS — Wardrobe Department
- shadcn/ui — Set Design
- CVA — Costume Variants
- clsx + tw-merge — Wardrobe Assistants
- tw-animate-css — Choreography
- next-themes — Lighting

### Tier 6 — SPECIAL THANKS (dev tooling)
- TypeScript — Script Supervisor
- PostgreSQL — The Archive
- Bun — The Stage Manager
- ESLint — Continuity

### Closing Card
- "Built by Gianluca Esposito"
- "No dependencies were mass-assigned. Every package was individually cast."
- "755 packages auditioned. 33 made the cut."
- "This production was built in a node_modules the size of a small country."
- [ ← Back to Pipevals ] link

## Page Flow

1. **Landing state**: Dark screen with "PIPEVALS" title, two buttons: [▶ CSS Credits] and [▶ Cinematic]
2. **CSS Credits**: Full-screen dark bg with dot grid. Text rolls upward via CSS @keyframes. Hover pauses scroll, dependency names are clickable links to npm. Audio plays via HTML5 `<audio>`.
3. **Cinematic**: Full-screen Remotion `<Player>` (lazy-loaded). Scene-based composition with spring animations, fades. `<Audio>` component for soundtrack. Scrub/seek/fullscreen controls.

## Audio

- User-initiated playback (browser autoplay policy)
- Clicking either play button starts both animation and audio
- Mute toggle always visible during playback
- Audio file at `public/credits/soundtrack.mp3` (placeholder — user provides)

## CSS Credits — Key Behaviors

- `@keyframes roll`: translateY(100vh) → translateY(-100%)
- Fade masks at top/bottom via CSS gradient overlays
- `animation-play-state: paused` on container `:hover`
- Dependency names are `<a>` tags linking to npm, cyan underline on hover
- Duration: ~60 seconds

## Remotion — Key Decisions

- Use `@remotion/player` for in-browser playback (no pre-render)
- Load via `next/dynamic` with `ssr: false`
- Each tier = a `<Sequence>` in the composition
- `spring()` for element entrance animations
- Links not supported inside Player (non-interactive — pure theater)
- Can render to .mp4 later via `npx remotion render`
