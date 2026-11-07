import { notFound } from "next/navigation";
import { AuthGate } from "../../components/auth-gate";
import { AdminDashboardView } from "../../operations/admin/admin-dashboard-view";
import { adminTabs } from "../dashboard-tabs";

export default async function AdminScreen({params}:{params:Promise<{screen:string[]}>}) {
 const {screen}=await params;
 const [section,record]=screen;
 const actions:Record<string,string[]>={wallets:["freeze","unfreeze"],transactions:["reverse","search","lookup","reference"],webhooks:["reprocess","replay"]};
 const directories=["customers","merchants","agents","identity","deposits","withdrawals","collections"];
 if(!adminTabs.some(tab=>tab.id===section)||screen.length>2 || (record && !(actions[section]?.includes(record)||(directories.includes(section)&&(/^\d+$/.test(record)||(section==="agents"&&record==="new"))))))notFound();
 return <AuthGate role="admin"><AdminDashboardView /></AuthGate>;
}
