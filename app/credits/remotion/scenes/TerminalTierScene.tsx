import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CreditTier } from "../../credits-data";

export function TerminalTierScene({ tier }: { tier: CreditTier }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = width / 720;
  const padding = Math.round(60 * scale);
  const isPortrait = height > width;

  const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#141416",
        justifyContent: "center",
        fontFamily: "monospace",
        padding,
      }}
    >
      <p
        style={{
          fontSize: 20 * scale,
          color: "#e2e8f0",
          margin: `0 0 ${24 * scale}px 0`,
          opacity: titleOpacity,
        }}
      >
        ## {tier.title.toUpperCase()}
      </p>

      {tier.entries.map((entry, i) => {
        const lineDelay = 10 + i * 8;
        const lineOpacity = interpolate(
          frame,
          [lineDelay, lineDelay + 6],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={entry.name}
            style={{
              opacity: lineOpacity,
              margin: `0 0 ${isPortrait ? 16 * scale : 8 * scale}px ${24 * scale}px`,
            }}
          >
            <p
              style={{
                fontSize: 22 * scale,
                color: "#e2e8f0",
                margin: 0,
              }}
            >
              {entry.name}
            </p>
            <p
              style={{
                fontSize: 16 * scale,
                color: "#94a3b8",
                margin: `${2 * scale}px 0 0 0`,
              }}
            >
              {entry.role}
            </p>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
