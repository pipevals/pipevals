import { AbsoluteFill, Sequence } from "remotion";
import { creditsTiers } from "../credits-data";
import { TerminalTitleScene } from "./scenes/TerminalTitleScene";
import { TerminalTierScene } from "./scenes/TerminalTierScene";
import { TerminalClosingScene } from "./scenes/TerminalClosingScene";

const FPS = 30;

// — Pacing controls —
// TITLE_DURATION: how long the typing + "scanning" intro stays on screen
const TITLE_DURATION = 3 * FPS;
// TIER_BASE_DURATION: minimum time each tier gets before entries start appearing
const TIER_BASE_DURATION = 1.5 * FPS;
// ENTRIES_PER_SECOND: how many entries appear per second — lower = slower
const ENTRIES_PER_SECOND = 1.5;
// CLOSING_DURATION: how long the "author:" closing card stays on screen
const CLOSING_DURATION = 5 * FPS;

function tierDuration(entryCount: number) {
  return Math.round(TIER_BASE_DURATION + (entryCount / ENTRIES_PER_SECOND) * FPS);
}

export function getTerminalTotalDuration() {
  let total = TITLE_DURATION;
  for (const tier of creditsTiers) {
    total += tierDuration(tier.entries.length);
  }
  total += CLOSING_DURATION;
  return total;
}

export function TerminalComposition() {
  let offset = 0;

  const sequences: React.ReactNode[] = [];

  // Title (typing + scanning)
  sequences.push(
    <Sequence key="title" from={offset} durationInFrames={TITLE_DURATION}>
      <TerminalTitleScene />
    </Sequence>
  );
  offset += TITLE_DURATION;

  // Tiers
  for (const tier of creditsTiers) {
    const duration = tierDuration(tier.entries.length);
    sequences.push(
      <Sequence key={tier.title} from={offset} durationInFrames={duration}>
        <TerminalTierScene tier={tier} />
      </Sequence>
    );
    offset += duration;
  }

  // Closing
  sequences.push(
    <Sequence key="closing" from={offset} durationInFrames={CLOSING_DURATION}>
      <TerminalClosingScene />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#141416" }}>
      {sequences}
    </AbsoluteFill>
  );
}
