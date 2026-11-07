import type { DemoUser } from "./mock/demo-users";

// Compatibility for old preview screens: sample sessions can never authenticate.
export const DEMO_AUTH_ENABLED = false;
export type DemoSession = Pick<DemoUser, "email" | "role" | "name">;
export function clearDemoSession(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem("sutura_demo_session");
}
export function getDemoSession(): DemoSession | null {
  clearDemoSession();
  return null;
}
