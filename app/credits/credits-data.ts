export interface CreditEntry {
  name: string;
  role: string;
  url: string;
}

export interface CreditTier {
  title: string;
  entries: CreditEntry[];
}

export const creditsTiers: CreditTier[] = [
  {
    title: "Starring",
    entries: [
      {
        name: "OpenSpec",
        role: "The Architect",
        url: "https://openspec.dev",
      },
      {
        name: "Skills.sh",
        role: "The Talent Agent",
        url: "https://skills.sh",
      },
      {
        name: "Workflow",
        role: "The Orchestrator",
        url: "https://useworkflow.dev",
      },
      {
        name: "Next.js",
        role: "The Director",
        url: "https://nextjs.org",
      },
      {
        name: "React",
        role: "The Producer",
        url: "https://react.dev",
      },
    ],
  },
  {
    title: "Co-Starring",
    entries: [
      {
        name: "React Flow",
        role: "The Set Builder",
        url: "https://reactflow.dev",
      },
      {
        name: "Better Auth",
        role: "The Gatekeeper",
        url: "https://better-auth.com",
      },
      {
        name: "Vercel AI SDK",
        role: "The Lead Writer",
        url: "https://ai-sdk.dev",
      },
      {
        name: "Drizzle ORM",
        role: "The Recordist",
        url: "https://orm.drizzle.team",
      },
      {
        name: "PostgreSQL",
        role: "The Archivist",
        url: "https://npmx.dev/package/postgres",
      },
    ],
  },
  {
    title: "Featuring",
    entries: [
      {
        name: "shadcn/ui",
        role: "The Set Decorator",
        url: "https://ui.shadcn.com",
      },
      {
        name: "Recharts",
        role: "The Data Wrangler",
        url: "https://recharts.github.io",
      },
      {
        name: "Zustand",
        role: "The Stage Hand",
        url: "https://zustand-demo.pmnd.rs",
      },
      {
        name: "SWR",
        role: "The Runner",
        url: "https://swr.vercel.app",
      },
    ],
  },
  {
    title: "Supporting Cast",
    entries: [
      {
        name: "Zod",
        role: "The Copy Editor",
        url: "https://zod.dev",
      },
      {
        name: "Hugeicons",
        role: "The Illustrator",
        url: "https://hugeicons.com",
      },
      {
        name: "Sonner",
        role: "The Production Assistant",
        url: "https://sonner.emilkowal.ski",
      },
      {
        name: "cmdk",
        role: "The Prompter",
        url: "https://npmx.dev/package/cmdk",
      },
      {
        name: "Luxon",
        role: "The Clapper",
        url: "https://moment.github.io/luxon",
      },
      {
        name: "Remotion",
        role: "The Cinematographer",
        url: "https://www.remotion.dev",
      },
    ],
  },
  {
    title: "Crew",
    entries: [
      {
        name: "Tailwind CSS",
        role: "The Costume Designer",
        url: "https://tailwindcss.com",
      },
      {
        name: "Radix UI",
        role: "The Prop Master",
        url: "https://www.radix-ui.com",
      },
      {
        name: "CVA",
        role: "The Tailor",
        url: "https://cva.style",
      },
      {
        name: "tw-animate-css",
        role: "The Choreographer",
        url: "https://npmx.dev/package/tw-animate-css",
      },
      {
        name: "next-themes",
        role: "The Lighting Director",
        url: "https://npmx.dev/package/next-themes",
      },
    ],
  },
  {
    title: "Special Thanks",
    entries: [
      {
        name: "Bun",
        role: "The Stage Manager",
        url: "https://bun.sh",
      },
      {
        name: "TypeScript",
        role: "The Script Supervisor",
        url: "https://www.typescriptlang.org",
      },
      {
        name: "ESLint",
        role: "The Continuity Editor",
        url: "https://eslint.org",
      },
    ],
  },
];

export const closingLines = [
  "No dependencies were mass-assigned.",
  "Every package was individually cast.",
  "",
  "This production was built in a node_modules",
  "the size of a small country.",
];
