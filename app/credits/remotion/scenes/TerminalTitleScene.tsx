import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const COMMAND = "pipevals --credits";

export function TerminalTitleScene() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = width / 720;
  const padding = Math.round(60 * scale);

  const charsVisible = Math.min(
    Math.floor(frame / 2),
    COMMAND.length
  );

  const showCursor = frame % 30 < 20;
  const commandDoneFrame = COMMAND.length * 2;

  const scanningOpacity = interpolate(
    frame,
    [commandDoneFrame + 15, commandDoneFrame + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const resolvingOpacity = interpolate(
    frame,
    [commandDoneFrame + 35, commandDoneFrame + 45],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
          fontSize: 24 * scale,
          color: "#e2e8f0",
          margin: 0,
        }}
      >
        <span style={{ opacity: 0.5 }}>$ </span>
        {COMMAND.slice(0, charsVisible)}
        {frame < commandDoneFrame && showCursor && (
          <span>▊</span>
        )}
      </p>

      {frame >= commandDoneFrame + 15 && (
        <p
          style={{
            fontSize: 20 * scale,
            color: "#94a3b8",
            margin: `${12 * scale}px 0 0 0`,
            opacity: scanningOpacity,
          }}
        >
          Scanning dependency tree... done.
        </p>
      )}
      {frame >= commandDoneFrame + 35 && (
        <p
          style={{
            fontSize: 20 * scale,
            color: "#94a3b8",
            margin: `${6 * scale}px 0 0 0`,
            opacity: resolvingOpacity,
          }}
        >
          Resolving 755 packages across 33 direct dependencies.
        </p>
      )}
    </AbsoluteFill>
  );
}
