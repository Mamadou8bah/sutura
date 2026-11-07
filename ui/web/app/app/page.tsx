import { AuthGate } from "../components/auth-gate";
import { CustomerAppView } from "./customer-app-view";

export default function CustomerAppPage() {
  return (
    <AuthGate role="customer">
      <CustomerAppView />
    </AuthGate>
  );
}
