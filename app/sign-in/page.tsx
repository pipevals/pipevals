import { SignInCard } from "./sign-in-card";

const devAuthEnabled = process.env.NODE_ENV !== "production";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <SignInCard devAuthEnabled={devAuthEnabled} />
    </div>
  );
}
