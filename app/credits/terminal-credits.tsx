"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { creditsTiers, closingLines } from "./credits-data";

// — Pacing controls —
// TYPING_SPEED: ms per character when typing the command
const TYPING_SPEED = 60;
// LINE_DELAY: ms between each new line of output
const LINE_DELAY = 120;
// SECTION_PAUSE: extra ms pause before a new tier heading
const SECTION_PAUSE = 600;
// SCROLL_LINES: how many extra lines to reveal per scroll tick (scroll down = faster)
const SCROLL_LINES = 3;

interface Line {
  text: string;
  className: string;
  href?: string;
  pause?: number; // extra delay before this line
}

function buildLines(): Line[] {
  const lines: Line[] = [];

  lines.push({
    text: "Scanning dependency tree... done.",
    className: "text-muted-foreground",
    pause: 400,
  });
  lines.push({
    text: "Resolving 755 packages across 33 direct dependencies.",
    className: "text-muted-foreground",
    pause: 300,
  });
  lines.push({ text: "", className: "" });

  for (const tier of creditsTiers) {
    lines.push({
      text: `## ${tier.title.toUpperCase()}`,
      className: "text-foreground",
      pause: SECTION_PAUSE,
    });
    lines.push({ text: "", className: "" });

    for (const entry of tier.entries) {
      const dots = Math.max(2, 32 - entry.name.length);
      lines.push({
        text: `  ${entry.name} ${"·".repeat(dots)} ${entry.role}`,
        className: "text-foreground/80",
        href: entry.url,
      });
    }

    lines.push({ text: "", className: "" });
  }

  lines.push({ text: "---", className: "text-muted-foreground/50", pause: SECTION_PAUSE });
  lines.push({ text: "", className: "" });
  lines.push({
    text: "author: Gianluca Esposito",
    className: "text-foreground",
    pause: 400,
  });
  lines.push({ text: "", className: "" });

  for (const line of closingLines) {
    if (line === "") {
      lines.push({ text: "", className: "" });
    } else {
      lines.push({ text: `# ${line}`, className: "text-muted-foreground/60" });
    }
  }

  return lines;
}

const COMMAND = "pipevals --credits";
const ALL_LINES = buildLines();

export function TerminalCredits({ onEnd }: { onEnd?: () => void } = {}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"typing" | "output">("typing");
  const [typedChars, setTypedChars] = useState(0);
  const visibleLinesRef = useRef(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isPausedRef = useRef(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-scroll to bottom when new lines appear (unless user scrolled up)
  useEffect(() => {
    if (!isUserScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleLines, typedChars, isUserScrolled]);

  // Detect user scrolling away from bottom
  const handleNativeScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsUserScrolled(!atBottom);
  }, []);

  // Typing phase — starts immediately
  useEffect(() => {
    if (phase !== "typing") return;

    if (typedChars < COMMAND.length) {
      timerRef.current = setTimeout(() => {
        setTypedChars((c) => c + 1);
      }, TYPING_SPEED);
    } else {
      timerRef.current = setTimeout(() => {
        setPhase("output");
      }, 500);
    }

    return () => clearTimeout(timerRef.current);
  }, [phase, typedChars]);

  // Output phase — reveal lines one by one
  useEffect(() => {
    if (phase !== "output") return;
    if (isPausedRef.current) return;

    if (visibleLines < ALL_LINES.length) {
      const nextLine = ALL_LINES[visibleLines];
      const delay = (nextLine.pause ?? 0) + LINE_DELAY;

      timerRef.current = setTimeout(() => {
        visibleLinesRef.current = visibleLines + 1;
        setVisibleLines(visibleLines + 1);
      }, delay);
    } else {
      timerRef.current = setTimeout(() => {
        onEnd?.();
      }, 3000);
    }

    return () => clearTimeout(timerRef.current);
  }, [phase, visibleLines, onEnd]);

  // Wheel handler — scroll down to reveal lines faster, scroll up to go back
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (phase !== "output") return;
      e.preventDefault();

      isPausedRef.current = true;
      clearTimeout(timerRef.current);
      clearTimeout(pauseTimeoutRef.current);

      const direction = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(
        visibleLinesRef.current + direction * SCROLL_LINES,
        ALL_LINES.length
      ));

      visibleLinesRef.current = next;
      setVisibleLines(next);

      pauseTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
        setVisibleLines((v) => v);
      }, 2000);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [phase]);

  // Touch handler
  useEffect(() => {
    if (phase !== "output") return;

    let lastTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
      isPausedRef.current = true;
      clearTimeout(timerRef.current);
      clearTimeout(pauseTimeoutRef.current);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const deltaY = lastTouchY - e.touches[0].clientY;
      lastTouchY = e.touches[0].clientY;

      const direction = deltaY > 0 ? 1 : -1;
      if (Math.abs(deltaY) > 20) {
        const next = Math.max(0, Math.min(
          visibleLinesRef.current + direction * SCROLL_LINES,
          ALL_LINES.length
        ));
        visibleLinesRef.current = next;
        setVisibleLines(next);
      }
    };

    const handleTouchEnd = () => {
      pauseTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
        setVisibleLines((v) => v);
      }, 2000);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [phase]);

  return (
    <div className="flex flex-1 flex-col bg-background font-mono">
      {/* Scrollable terminal output */}
      <div
        ref={containerRef}
        onScroll={handleNativeScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-2xl mx-auto">
          {/* Command line */}
          <p className="text-foreground text-sm mb-1">
            <span className="text-muted-foreground">$ </span>
            {COMMAND.slice(0, typedChars)}
            {phase === "typing" && (
              <span className="animate-pulse">▊</span>
            )}
          </p>

          {/* Output lines */}
          {phase === "output" && (
            <div className="mt-2">
              {ALL_LINES.slice(0, visibleLines).map((line, i) => {
                if (line.text === "") {
                  return <div key={i} className="h-3" />;
                }

                if (line.href) {
                  const parts = line.text.match(/^( +)(.+?)( ·+.*)$/);
                  if (parts) {
                    return (
                      <p key={i} className={`text-sm ${line.className}`}>
                        {parts[1]}
                        <a
                          href={line.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:underline"
                        >
                          {parts[2]}
                        </a>
                        <span className="text-muted-foreground/30">
                          {parts[3].match(/( ·+ )/)?.[1]}
                        </span>
                        <span className="text-muted-foreground">
                          {parts[3].replace(/^ ·+ /, "")}
                        </span>
                      </p>
                    );
                  }
                }

                return (
                  <p key={i} className={`text-sm ${line.className}`}>
                    {line.text}
                  </p>
                );
              })}

              {/* Blinking cursor at the end */}
              {visibleLines >= ALL_LINES.length && (
                <p className="text-foreground text-sm mt-4">
                  <span className="animate-pulse">▊</span>
                </p>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border">
        <span className="text-xs text-muted-foreground/50">
          {visibleLines}/{ALL_LINES.length} lines
          {isUserScrolled && " · scroll down to follow"}
        </span>
        <span className="text-xs text-muted-foreground/30">scroll to control speed</span>
      </div>
    </div>
  );
}
