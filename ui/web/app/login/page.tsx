import type { Metadata } from "next";
import { CombinedAuthPage } from "../auth-content";

export const metadata: Metadata = { title: "Log in", description: "Log in to your Sutura developer or admin account." };

export default function LoginPage() {
  return <CombinedAuthPage />;
}
