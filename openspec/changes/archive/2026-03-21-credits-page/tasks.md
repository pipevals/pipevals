# Credits Page — Tasks

## Tasks

- [x] Create `app/credits/credits-data.ts` with static credits tiers, dependency names, roles, and npm URLs
- [x] Create `app/credits/css-credits.tsx` — CSS rolling credits component with keyframe animation, fade masks, hover-to-pause, clickable npm links, and audio integration
- [x] Create `app/credits/page.tsx` — Landing state with variant toggle (CSS Credits / Cinematic buttons), shared audio element
- [x] Install Remotion dependencies (`@remotion/core`, `@remotion/player`)
- [x] Create `app/credits/remotion/scenes/TitleScene.tsx` — Opening "PIPEVALS CREDITS" card with fade-in
- [x] Create `app/credits/remotion/scenes/TierScene.tsx` — Reusable scene for each credit tier with spring animations
- [x] Create `app/credits/remotion/scenes/ClosingScene.tsx` — "Built by Gianluca Esposito" closing card with quips
- [x] Create `app/credits/remotion/CreditComposition.tsx` — Root composition wiring all scenes as Sequences with Audio
- [x] Create `app/credits/remotion/RemotionPlayer.tsx` — Player wrapper, loaded via next/dynamic (ssr: false)
- [x] Add credits link to landing page footer
- [x] Update README.md with credits page mention
