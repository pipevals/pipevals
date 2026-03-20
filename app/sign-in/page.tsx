import { SignInCard } from "./sign-in-card";
import { isAutoInviteEnabled } from "@/lib/auto-invite";

const devAuthEnabled = process.env.NODE_ENV !== "production";
const showUpdatesCheckbox = isAutoInviteEnabled();

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <SignInCard
        devAuthEnabled={devAuthEnabled}
        showUpdatesCheckbox={showUpdatesCheckbox}
      />
    </div>
  );
}
