"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

type Language = "python" | "node";

// ─── Token types & parser ───────────────────────────────────────────

type Token =
  | { type: "text"; content: string }
  | { type: "span"; color: string; content: string };

function parseTokens(html: string): Token[] {
  const re = /<span style="color:(#[0-9a-fA-F]{6})">([^<]*)<\/span>/g;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: html.slice(lastIndex, match.index),
      });
    }
    tokens.push({ type: "span", color: match[1], content: match[2] });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < html.length) {
    tokens.push({ type: "text", content: html.slice(lastIndex) });
  }

  return tokens;
}

// ─── Pre-computed example data ──────────────────────────────────────

const examples: Record<
  Language,
  {
    label: string;
    commentPrefix: string;
    beforeTokens: Token[];
    baseTokens: Token[];
    diffTokens: Token[];
  }
> = {
  python: {
    label: "python",
    commentPrefix: "#",
    beforeTokens: parseTokens(
      `<span style="color:#569cd6">from</span> openai <span style="color:#569cd6">import</span> OpenAI
<span style="color:#569cd6">import</span> os

client = <span style="color:#dcdcaa">OpenAI</span>(api_key=os.environ[<span style="color:#ce9178">"OPENAI_API_KEY"</span>])

prompt = <span style="color:#ce9178">"Explain quantum computing."</span>

response = client.responses.<span style="color:#dcdcaa">create</span>(
    model=<span style="color:#ce9178">"gpt-4.1"</span>,
    input=prompt
)

output_text = response.output[<span style="color:#b5cea8">0</span>].content[<span style="color:#b5cea8">0</span>].text
<span style="color:#dcdcaa">print</span>(output_text)`,
    ),
    baseTokens: parseTokens(
      `<span style="color:#569cd6">from</span> openai <span style="color:#569cd6">import</span> OpenAI
<span style="color:#569cd6">import</span> requests
<span style="color:#569cd6">import</span> os

client = <span style="color:#dcdcaa">OpenAI</span>(api_key=os.environ[<span style="color:#ce9178">"OPENAI_API_KEY"</span>])

prompt = <span style="color:#ce9178">"Explain quantum computing."</span>

response = client.responses.<span style="color:#dcdcaa">create</span>(
    model=<span style="color:#ce9178">"gpt-4.1"</span>,
    input=prompt
)

output_text = response.output[<span style="color:#b5cea8">0</span>].content[<span style="color:#b5cea8">0</span>].text`,
    ),
    diffTokens: parseTokens(
      `

<span style="color:#6a9955"># Trigger your evaluation pipeline</span>
requests.<span style="color:#dcdcaa">post</span>(
    <span style="color:#569cd6">f</span><span style="color:#ce9178">"{PIPEVALS_URL}/api/pipelines/{ID}/runs"</span>,
    headers={<span style="color:#ce9178">"x-api-key"</span>: KEY},
    json={
        <span style="color:#ce9178">"prompt"</span>: prompt,
        <span style="color:#ce9178">"response"</span>: output_text,
    },
)`,
    ),
  },
  node: {
    label: "node.js",
    commentPrefix: "//",
    beforeTokens: parseTokens(
      `<span style="color:#569cd6">import</span> OpenAI <span style="color:#569cd6">from</span> <span style="color:#ce9178">"openai"</span>;

<span style="color:#569cd6">const</span> client = <span style="color:#569cd6">new</span> <span style="color:#dcdcaa">OpenAI</span>({
  apiKey: process.env.OPENAI_API_KEY,
});

<span style="color:#569cd6">const</span> prompt = <span style="color:#ce9178">"Explain quantum computing."</span>;

<span style="color:#569cd6">const</span> response = <span style="color:#569cd6">await</span> client.responses.<span style="color:#dcdcaa">create</span>({
  model: <span style="color:#ce9178">"gpt-4.1"</span>,
  input: prompt,
});

<span style="color:#569cd6">const</span> outputText =
  response.output?.[<span style="color:#b5cea8">0</span>]?.content?.[<span style="color:#b5cea8">0</span>]?.text || <span style="color:#ce9178">""</span>;

console.<span style="color:#dcdcaa">log</span>(outputText);`,
    ),
    baseTokens: parseTokens(
      `<span style="color:#569cd6">import</span> OpenAI <span style="color:#569cd6">from</span> <span style="color:#ce9178">"openai"</span>;

<span style="color:#569cd6">const</span> client = <span style="color:#569cd6">new</span> <span style="color:#dcdcaa">OpenAI</span>({
  apiKey: process.env.OPENAI_API_KEY,
});

<span style="color:#569cd6">const</span> prompt = <span style="color:#ce9178">"Explain quantum computing."</span>;

<span style="color:#569cd6">const</span> response = <span style="color:#569cd6">await</span> client.responses.<span style="color:#dcdcaa">create</span>({
  model: <span style="color:#ce9178">"gpt-4.1"</span>,
  input: prompt,
});

<span style="color:#569cd6">const</span> outputText =
  response.output.[<span style="color:#b5cea8">0</span>].content.[<span style="color:#b5cea8">0</span>].text;`,
    ),
    diffTokens: parseTokens(
      `

<span style="color:#6a9955">// Trigger your evaluation pipeline</span>
<span style="color:#569cd6">await</span> <span style="color:#dcdcaa">fetch</span>(<span style="color:#ce9178">\`\${process.env.PIPEVALS_URL}/api/pipelines/\${process.env.ID}/runs\`</span>, {
  method: <span style="color:#ce9178">"POST"</span>,
  headers: {
    <span style="color:#ce9178">"Content-Type"</span>: <span style="color:#ce9178">"application/json"</span>,
    <span style="color:#ce9178">"x-api-key"</span>: process.env.KEY,
  },
  body: JSON.<span style="color:#dcdcaa">stringify</span>({
    prompt,
    response: outputText,
  }),
});`,
    ),
  },
};

// ─── Render helpers ─────────────────────────────────────────────────

function renderTokens(tokens: Token[]) {
  return tokens.map((token, i) => {
    if (token.type === "text") return token.content;
    return (
      <span key={i} style={{ color: token.color }}>
        {token.content}
      </span>
    );
  });
}

// ─── Typewriter hook ────────────────────────────────────────────────

function useTypewriter(tokens: Token[], speed = 20) {
  const [charIndex, setCharIndex] = useState(0);

  const totalChars = useMemo(
    () => tokens.reduce((sum, t) => sum + t.content.length, 0),
    [tokens],
  );

  useEffect(() => {
    setCharIndex(0);
  }, [tokens]);

  const playing = charIndex < totalChars;
  const done = charIndex >= totalChars;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setCharIndex((c) => c + 1), speed);
    return () => clearTimeout(id);
  }, [playing, charIndex, speed]);

  const skip = useCallback(() => setCharIndex(totalChars), [totalChars]);
  const replay = useCallback(() => setCharIndex(0), []);

  const visibleTokens = useMemo(() => {
    if (charIndex >= totalChars) return tokens;

    const result: Token[] = [];
    let remaining = charIndex;

    for (const token of tokens) {
      if (remaining <= 0) break;
      if (remaining >= token.content.length) {
        result.push(token);
        remaining -= token.content.length;
      } else {
        result.push({ ...token, content: token.content.slice(0, remaining) });
        break;
      }
    }

    return result;
  }, [tokens, charIndex, totalChars]);

  return { visibleTokens, playing, done, skip, replay };
}

// ─── Component ──────────────────────────────────────────────────────

export function CodeComparison({ dark = false }: { dark?: boolean }) {
  const [lang, setLang] = useState<Language>("python");
  const example = examples[lang];
  const { visibleTokens, playing, done, skip, replay } = useTypewriter(
    example.diffTokens,
  );

  return (
    <>
      <style>{`@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div className="flex justify-center gap-1 mb-6">
        {(["python", "node"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
              lang === l
                ? dark
                  ? "bg-[#2d3135] text-[#00F0FF]"
                  : "bg-[#1e1e1e] text-white"
                : dark
                  ? "text-[#94a3b8] hover:text-white"
                  : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {l === "python" ? "Python" : "Node.js"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#2d3135] border border-[#2d3135] rounded-lg overflow-hidden shadow-inner">
        {/* Standard LLM Call */}
        <div className="bg-[#1e1e1e] p-6 lg:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest flex items-center text-[#94a3b8]">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              Your LLM Call
            </span>
            <span className="text-[10px] text-[#94a3b8]">{example.label}</span>
          </div>
          <pre
            className="grow text-[13px] leading-relaxed text-[#d4d4d4] overflow-x-auto whitespace-pre"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            }}
          >
            {renderTokens(example.beforeTokens)}
          </pre>
          <div className="mt-8 pt-6 border-t border-white/5">
            <span className="text-[10px] italic text-[#94a3b8]">
              {example.commentPrefix} No evaluation data captured
            </span>
          </div>
        </div>

        {/* Pipevals Enhanced */}
        <div className="bg-[#1e1e1e] p-6 lg:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest flex items-center text-[#0033FF]">
              <span className="w-2 h-2 rounded-full bg-[#0033FF] animate-pulse mr-2" />
              + Pipevals Evaluation
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#0033FF] font-bold">
                +8 lines
              </span>
              <button
                onClick={playing ? skip : replay}
                className="text-[10px] font-bold text-[#94a3b8] hover:text-white transition-colors"
              >
                {playing ? "⏩ Skip" : "↺ Replay"}
              </button>
            </div>
          </div>
          <pre
            className="grow text-[13px] leading-relaxed text-[#d4d4d4] overflow-x-auto whitespace-pre relative"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            }}
          >
            <span className="invisible" aria-hidden="true">{renderTokens(example.baseTokens)}{renderTokens(example.diffTokens)}</span>
            <span className="absolute top-0 left-0">
              {renderTokens(example.baseTokens)}{renderTokens(visibleTokens)}
              {playing && (
                <span
                  className="text-[#569cd6]"
                  style={{ animation: "cursor-blink 1s step-end infinite" }}
                >
                  |
                </span>
              )}
            </span>
          </pre>
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#0033FF]">
              {example.commentPrefix} Pipeline runs, metrics stream to your
              dashboard
            </span>
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
