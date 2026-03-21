// Render to video (9:16, 1080x1920):
// bunx remotion render app/credits/remotion/index.tsx Credits --output public/credits.mp4

import { registerRoot, Composition } from "remotion";
import { TerminalComposition, getTerminalTotalDuration } from "./TerminalComposition";

const FPS = 30;

function RemotionRoot() {
  return (
    <Composition
      id="Credits"
      component={TerminalComposition}
      durationInFrames={getTerminalTotalDuration()}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
}

registerRoot(RemotionRoot);
