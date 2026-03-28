"use client";

import { useState } from "react";

type Language = "python" | "node";

const examples: Record<
  Language,
  { label: string; before: string; after: string; commentPrefix: string }
> = {
  python: {
    label: "python",
    commentPrefix: "#",
    before: `<span style="color:#569cd6">from</span> openai <span style="color:#569cd6">import</span> OpenAI
<span style="color:#569cd6">import</span> os

client = <span style="color:#dcdcaa">OpenAI</span>(api_key=os.environ[<span style="color:#ce9178">"OPENAI_API_KEY"</span>])

prompt = <span style="color:#ce9178">"Explain quantum computing."</span>

response = client.responses.<span style="color:#dcdcaa">create</span>(
    model=<span style="color:#ce9178">"gpt-4.1"</span>,
    input=prompt
)

output_text = response.output[<span style="color:#b5cea8">0</span>].content[<span style="color:#b5cea8">0</span>].text
<span style="color:#dcdcaa">print</span>(output_text)`,
    after: `<span style="color:#569cd6">from</span> openai <span style="color:#569cd6">import</span> OpenAI
<span style="color:#569cd6">import</span> requests
<span style="color:#569cd6">import</span> os

client = <span style="color:#dcdcaa">OpenAI</span>(api_key=os.environ[<span style="color:#ce9178">"OPENAI_API_KEY"</span>])

prompt = <span style="color:#ce9178">"Explain quantum computing."</span>

response = client.responses.<span style="color:#dcdcaa">create</span>(
    model=<span style="color:#ce9178">"gpt-4.1"</span>,
    input=prompt
)

output_text = response.output[<span style="color:#b5cea8">0</span>].content[<span style="color:#b5cea8">0</span>].text

<span style="color:#6a9955"># Trigger your evaluation pipeline</span>
requests.<span style="color:#dcdcaa">post</span>(
    <span style="color:#569cd6">f</span><span style="color:#ce9178">"{PIPEVALS_URL}/api/pipelines/{ID}/runs"</span>,
    headers={<span style="color:#ce9178">"x-api-key"</span>: KEY},
    json={
        <span style="color:#ce9178">"prompt"</span>: prompt,
        <span style="color:#ce9178">"response"</span>: output_text,
    },
)`,
  },
  node: {
    label: "node.js",
    commentPrefix: "//",
    before: `<span style="color:#569cd6">import</span> OpenAI <span style="color:#569cd6">from</span> <span style="color:#ce9178">"openai"</span>;

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
    after: `<span style="color:#569cd6">import</span> OpenAI <span style="color:#569cd6">from</span> <span style="color:#ce9178">"openai"</span>;

<span style="color:#569cd6">const</span> client = <span style="color:#569cd6">new</span> <span style="color:#dcdcaa">OpenAI</span>({
  apiKey: process.env.OPENAI_API_KEY,
});

<span style="color:#569cd6">const</span> prompt = <span style="color:#ce9178">"Explain quantum computing."</span>;

<span style="color:#569cd6">const</span> response = <span style="color:#569cd6">await</span> client.responses.<span style="color:#dcdcaa">create</span>({
  model: <span style="color:#ce9178">"gpt-4.1"</span>,
  input: prompt,
});

<span style="color:#569cd6">const</span> outputText =
  response.output.[<span style="color:#b5cea8">0</span>].content.[<span style="color:#b5cea8">0</span>].text;

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
  },
};

export function CodeComparison({ dark = false }: { dark?: boolean }) {
  const [lang, setLang] = useState<Language>("python");
  const example = examples[lang];

  return (
    <>
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
            dangerouslySetInnerHTML={{ __html: example.before }}
          />
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
            <span className="text-[10px] text-[#0033FF] font-bold">
              +8 lines
            </span>
          </div>
          <pre
            className="grow text-[13px] leading-relaxed text-[#d4d4d4] overflow-x-auto whitespace-pre"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            }}
            dangerouslySetInnerHTML={{ __html: example.after }}
          />
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
