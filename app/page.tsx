import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
});

export default function Home() {
  return (
    <div
      className={`${jakarta.variable} ${jetbrains.variable} min-h-screen text-[#e2e8f0] selection:bg-[#00F0FF] selection:text-[#0a0a0a]`}
      style={{
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle, #1a1c1e 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }}
    >
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#2d3135] backdrop-blur-md bg-[#0a0a0a]/95">
        <div className="flex justify-between items-center px-6 h-14 max-w-6xl mx-auto">
          <span
            className="text-xl font-extrabold tracking-tighter text-white"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            Pipevals
          </span>
          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://github.com/pipevals"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00F0FF] transition-colors"
            >
              GitHub
            </a>
            {/* <Link
              href="/sign-in"
              className="hover:text-[#00F0FF] transition-colors"
            >
              Demo
            </Link> */}
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-24 px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <section className="mb-24 max-w-3xl">
          {/* <blockquote className="mb-8">
            <p
              className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              &ldquo;&rdquo;
            </p>
            <cite className="block mt-3 text-sm text-[#94a3b8] not-italic"></cite>
          </blockquote> */}

          <p
            className="text-xl lg:text-2xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            Pipevals is the visual pipeline builder for evaluation-driven AI
            development.
          </p>
          <p className="text-base text-[#94a3b8] mb-8">
            Build evaluation graphs. Run them against datasets. Track quality
            over time.
          </p>

          <a
            href="https://github.com/pipevals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#00F0FF] text-[#0a0a0a] px-6 py-2.5 text-sm font-bold hover:bg-[#00d4e0] transition-colors"
          >
            Get Started
            <span aria-hidden="true">&rarr;</span>
          </a>
        </section>

        {/* Problem Cards */}
        <section className="mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className="bg-[#dbeafe] p-6 min-h-[240px] border border-blue-200 transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]"
              style={{
                transform: "rotate(-0.5deg)",
                boxShadow: "2px 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <h3
                className="font-bold text-slate-900 text-lg uppercase tracking-tight mb-4 pb-2 border-b border-blue-200"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                The Vibe Check
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                Most teams evaluate AI by eyeballing results. It works until it
                doesn&apos;t — and you won&apos;t know when it stops working.
              </p>
            </div>

            <div
              className="bg-[#fef3c7] p-6 min-h-[240px] border border-yellow-200 transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]"
              style={{
                transform: "rotate(0.8deg)",
                boxShadow: "2px 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <h3
                className="font-bold text-slate-900 text-lg uppercase tracking-tight mb-4 pb-2 border-b border-yellow-200"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                The Compound Error
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                95% accuracy per step sounds great. Over 10 steps, that&apos;s
                60% accuracy overall. The pipeline is only as good as its
                weakest link.
              </p>
            </div>

            <div
              className="bg-[#d1fae5] p-6 min-h-[240px] border border-green-200 transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]"
              style={{
                transform: "rotate(-0.3deg)",
                boxShadow: "2px 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <h3
                className="font-bold text-slate-900 text-lg uppercase tracking-tight mb-4 pb-2 border-b border-green-200"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                The Eval Gap
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">
                Everyone agrees you need evaluation pipelines. Somehow,
                you&apos;re still expected to build them from scratch.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-24">
          <h2
            className="text-3xl font-extrabold text-white tracking-tight mb-12"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            Build. Run. Measure.
          </h2>

          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-widest">
                    01
                  </span>
                  <h3
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
                  >
                    Build
                  </h3>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Drag steps onto a canvas and wire them together. Call models,
                  reshape data, capture scores, or pause for human review — all
                  without writing orchestration code.
                </p>
              </div>
              <video
                className="aspect-video w-full border border-[#2d3135] bg-[#1a1c1e]"
                src="/demo/build.mov"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-widest">
                    02
                  </span>
                  <h3
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
                  >
                    Run
                  </h3>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Trigger pipelines one at a time or batch them against a
                  dataset. Each item runs through the full graph, durably, with
                  step-by-step results you can inspect after.
                </p>
              </div>
              <video
                className="aspect-video w-full border border-[#2d3135] bg-[#1a1c1e]"
                src="/demo/run.mov"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-[#00F0FF] uppercase tracking-widest">
                    03
                  </span>
                  <h3
                    className="text-xl font-bold text-white"
                    style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
                  >
                    Measure
                  </h3>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  See where quality stands and where it&apos;s headed. Trend
                  charts, score distributions, step durations, and pass rates —
                  all populated automatically from your pipeline runs.
                </p>
              </div>
              <video
                className="aspect-video w-full border border-[#2d3135] bg-[#1a1c1e]"
                src="/demo/measure.mov"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          </div>
        </section>

        {/* Templates */}
        <section className="mb-24">
          <h2
            className="text-2xl font-extrabold text-white tracking-tight mb-2"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            Start in minutes, not sprints.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-[#2d3135] bg-[#1a1c1e] p-6">
              <h3
                className="font-bold text-[#00F0FF] text-sm uppercase tracking-wide mb-4"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                AI-as-a-Judge
              </h3>
              <div className="text-xs text-[#94a3b8] space-y-1 mb-4 font-mono">
                <p>Trigger</p>
                <p className="text-[#3f444a] pl-2">&darr;</p>
                <p className="pl-2">Generator</p>
                <p className="text-[#3f444a] pl-2">&darr;</p>
                <p className="pl-2">Judge</p>
                <p className="text-[#3f444a] pl-2">&darr;</p>
                <p className="pl-2">Metrics</p>
              </div>
              <p className="text-sm text-[#e2e8f0]">
                Score any model&apos;s output with an LLM judge.
              </p>
            </div>

            <div className="border border-[#2d3135] bg-[#1a1c1e] p-6">
              <h3
                className="font-bold text-[#00F0FF] text-sm uppercase tracking-wide mb-4"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                Model A/B Comparison
              </h3>
              <div className="text-xs text-[#94a3b8] space-y-1 mb-4 font-mono">
                <p>Trigger</p>
                <p className="text-[#3f444a] pl-2">
                  &darr; &nbsp;&nbsp;&nbsp;&darr;
                </p>
                <p className="pl-2">Model A &nbsp;&nbsp;Model B</p>
                <p className="text-[#3f444a] pl-2">
                  &darr; &nbsp;&nbsp;&nbsp;&darr;
                </p>
                <p className="pl-2">Collect Responses</p>
                <p className="text-[#3f444a] pl-2">&darr;</p>
                <p className="pl-2">Judge &rarr; Metrics</p>
              </div>
              <p className="text-sm text-[#e2e8f0]">
                Compare two models head to head.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d3135] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-[#3f444a] gap-4">
          <span className="text-white font-bold">Pipevals</span>
          <div className="flex gap-6">
            <Link
              href="/LICENSE"
              className="hover:text-[#00F0FF] transition-colors"
            >
              MIT License
            </Link>
            <a
              href="https://github.com/pipevals"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00F0FF] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://openspec.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00F0FF] transition-colors"
            >
              Built with OpenSpec
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
