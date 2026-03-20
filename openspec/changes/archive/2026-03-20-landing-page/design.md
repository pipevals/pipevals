## Context

The root route (`app/page.tsx`) is Next.js boilerplate. Pipevals needs a marketing landing page for its open-source launch. The page is a single-page design with a separate visual identity from the authenticated app.

From the explore session we established:

- Six sections: Nav, Hero, Problem Cards, How It Works (Build/Run/Measure), Templates, Footer
- Tone: calm, confident, slightly jovial
- CTA links to GitHub (https://github.com/pipevals)
- Demo video placeholders for "How it works" steps (added later)
- Separate design system from the app (different fonts, color palette, layout)

## Goals / Non-Goals

**Goals:**

- Replace boilerplate root page with a polished landing page
- Communicate what pipevals does, the problem it solves, and how it works
- Showcase the two seed templates as proof of immediate value
- Maintain a separate visual identity from the authenticated app

**Non-Goals:**

- No interactive demos or embedded app functionality
- No blog, docs, or multi-page marketing site
- No sign-up flow — CTA goes to GitHub
- No responsive mobile optimization beyond basic readability
- No analytics or tracking

## Decisions

### Single file in `app/page.tsx`

The entire landing page lives in `app/page.tsx` as a React Server Component. No new routes, no layout changes. The root layout already provides ThemeProvider and fonts.

**Why:** Minimal surface area. One file to maintain. The landing page has no interactivity that requires client components.

### Separate design language via scoped styles

The landing page uses its own visual identity:

- **Fonts**: Plus Jakarta Sans (headlines) + JetBrains Mono (body/data) via `next/font/google`
- **Colors**: dark background (`#0a0a0a`), electric blue accent (`#00F0FF`), pastel card colors
- **Background**: dot-grid pattern (CSS radial-gradient)
- **Cards**: sticky-note style with slight rotation and hover effects

These are scoped to the landing page component via Tailwind classes and a wrapping `<div>` with custom CSS variables. The app's Geist fonts and shadcn tokens remain untouched.

**Why not reuse the app design system?** The landing page is a marketing surface — it needs to be visually distinctive and memorable. The app is a tool — it needs to be functional and familiar (shadcn). Signing in transitions the user from "brand" to "product", which is a common pattern.

**Alternative considered:** Using the app's existing design tokens. Rejected because the app's neutral shadcn palette doesn't create the visual impact needed for a landing page.

### Content structure: quote → problems → solution → proof

The page follows a classic marketing structure:

1. **Hero**: Authority quote + one-line positioning
2. **Problems**: Three cards naming pain points (Vibe Check, Compound Error, Eval Gap)
3. **How It Works**: Build → Run → Measure with video placeholders
4. **Templates**: Two seed pipelines as concrete proof
5. **Footer**: Links

**Why this order:** The quote establishes credibility before we claim anything. Problems create tension. Solution resolves it. Templates prove it's real, not vaporware.

### Video placeholders instead of screenshots

The "How it works" steps will have `<!-- demo video placeholder -->` comments. The user will add demo videos later.

**Why:** The product is live and working — real demos are better than static screenshots. Placeholder now, upgrade later.

## Risks / Trade-offs

- **Two font families loaded on landing page** → Acceptable; they're only loaded on `/`, not on authenticated routes. Using `next/font/google` for automatic optimization.
- **Separate design language creates visual discontinuity** → Intentional. The sign-in page bridges the transition. Common pattern for developer tools (Vercel, Linear, etc.).
- **No mobile optimization beyond basic readability** → The primary audience will visit on desktop first (developer tool). Acceptable for launch.
