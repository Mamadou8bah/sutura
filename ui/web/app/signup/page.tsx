import type { Metadata } from "next";
import { CombinedAuthPage } from "../auth-content";

export const metadata: Metadata = {
  title: "Create a developer account",
  description: "Create a Sutura developer account to get API keys and take payments from your backend.",
};

export default function SignupPage() {
  return <CombinedAuthPage initialMode="signup" />;
}
