import { AuthGate } from "../components/auth-gate";
import { DashboardView } from "./dashboard-view";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardView />
    </AuthGate>
  );
}
