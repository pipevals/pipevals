import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { closingLines } from "../../credits-data";

export function TerminalClosingScene() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = width / 720;
  const padding = Math.round(60 * scale);

  const separatorOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const authorOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const quipsOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorBlink = frame % 30 < 20;

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
          fontSize: 18 * scale,
          color: "#64748b",
          margin: `0 0 ${24 * scale}px 0`,
          opacity: separatorOpacity,
        }}
      >
        ---
      </p>

      <p
        style={{
          fontSize: 28 * scale,
          color: "#e2e8f0",
          margin: `0 0 ${48 * scale}px 0`,
          opacity: authorOpacity,
        }}
      >
        author: Gianluca Esposito
      </p>

      <div style={{ opacity: quipsOpacity }}>
        {closingLines.map((line, i) =>
          line === "" ? (
            <div key={i} style={{ height: 12 * scale }} />
          ) : (
            <p
              key={i}
              style={{
                fontSize: 18 * scale,
                color: "#94a3b8",
                margin: `${4 * scale}px 0`,
                lineHeight: 1.6,
              }}
            >
              # {line}
            </p>
          )
        )}
      </div>

      {frame > 100 && (
        <p
          style={{
            fontSize: 20 * scale,
            color: "#e2e8f0",
            marginTop: 32 * scale,
            opacity: cursorBlink ? 1 : 0,
          }}
        >
          ▊
        </p>
      )}
    </AbsoluteFill>
  );
}
