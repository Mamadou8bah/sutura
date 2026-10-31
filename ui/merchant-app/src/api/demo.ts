import { API_BASE } from "./config";

let active = false;
let generation = 0;
const listeners = new Set<() => void>();
export const isDemoMode = () => active;
export function subscribeDemo(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
let balance = 12500;
const initialWallets = () => [{ id: 1, name: "Demo wallet", currency: "GMD", status: "ACTIVE", ownerId: 1, ledgerAccountCode: "DEMO" }];
let wallets = initialWallets();
let extraBalances: Record<number, number> = {};
const walletBalance = (id: number) => id === 1 ? balance : extraBalances[id] ?? 0;
function setWalletBalance(id: number, value: number) { if (id === 1) balance = value; else extraBalances[id] = value; }
let merchantCollections: Record<string, unknown>[] = [];
let collectionPaid: number | null = null;
let sequence = 100;
let operations: Record<string, Record<string, unknown>> = {};
let tickets: Record<string, unknown>[] = [];
let transactions: Record<string, unknown>[] = [];
export function setDemoMode(enabled: boolean) {
  if (active === enabled) return;
  active = enabled;
  generation++;
  wallets = initialWallets(); extraBalances = {};
  merchantCollections = []; balance = 12500; collectionPaid = null; sequence = 100; operations = {}; tickets = []; transactions = [];
  listeners.forEach((listener) => listener());
}
export function demoSession(role: string) {
  return { accessToken: `demo.${role}`, refreshToken: "demo.offline", username: "Demo account",
    firstName: "Demo", lastName: "User", role, email: "demo@example.invalid", userStatus: "ACTIVE", businessName: "Demo shop" };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
export function demoResponse(path: string, init?: RequestInit): Response {
  const method = (init?.method ?? "GET").toUpperCase();
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  const collection = () => ({reference:"DEMO-COLLECTION",merchantName:"Demo shop",amount:250,currency:"GMD",status:collectionPaid===null?"ACTIVE":"PAID",description:"Sample merchant purchase",transactionReference:collectionPaid===null?undefined:"DEMO-MERCHANT-PAYMENT"});
  if (path === "/api/v1/payment-links/ref/DEMO-COLLECTION" && method === "GET") return json(collection());
  if (path === "/api/v1/payment-links/ref/DEMO-COLLECTION/pay" && method === "POST") {
    const wallet = wallets.find(item=>item.id===Number(body.walletId));
    if (!wallet || wallet.currency!=="GMD" || wallet.status!=="ACTIVE") return json({message:"Choose an active GMD wallet."},400);
    if (collectionPaid!==null) return collectionPaid===wallet.id?json(collection()):json({message:"Payment already completed from another wallet."},400);
    if(walletBalance(wallet.id)<250)return json({message:"Insufficient demo balance."},400);
    setWalletBalance(wallet.id,walletBalance(wallet.id)-250);collectionPaid=wallet.id;
    transactions.unshift({id:++sequence,reference:"DEMO-MERCHANT-PAYMENT",type:"TRANSFER",amount:250,currency:"GMD",status:"COMPLETED",description:"Demo shop",sourceWalletId:wallet.id,createdAt:new Date().toISOString()});
    return json(collection());
  }
  if (path === "/api/v1/payment-links" && method === "POST") {
    const wallet=wallets.find(w=>w.id===Number(body.walletId));const amount=Number(body.amount);
    if(!wallet||wallet.status!=="ACTIVE"||wallet.currency!==body.currency||!Number.isFinite(amount)||amount<=0||amount>1e12||!Number.isInteger(body.expiresDays)||body.expiresDays<1||body.expiresDays>90)return json({message:"Choose an active wallet, valid amount and expiry."},400);
    const item={id:++sequence,reference:`plink-${sequence.toString(16).padStart(12,"0")}`,merchantName:"Demo shop",walletId:wallet.id,amount,currency:wallet.currency,status:"ACTIVE",description:String(body.description??""),expiresAt:new Date(Date.now()+body.expiresDays*86400000).toISOString()};merchantCollections.unshift(item);return json(item,201);
  }
  if(method==="GET" && path.startsWith("/api/v1/payment-links/ref/plink-")){const item=merchantCollections.find(c=>c.reference===path.split("/").pop());return item?json(item):json({message:"Collection not found."},404);}
  if (method === "GET") {
    if (path === "/api/v1/wallets") return json(wallets);
    if (/\/wallets\/\d+\/balance$/.test(path)) { const id = Number(path.split("/").at(-2)); return json({ id, balance: walletBalance(id), walletStatus: "ACTIVE", ledgerAccountCode: "DEMO" }); }
    if (path === "/api/v1/transactions") return json(transactions);
    if (path === "/api/v1/payment-links") return json([...merchantCollections,{ id: 1, walletId:1, ...collection() }]);
    if (path === "/api/v1/support") return json(tickets);
    if (path === "/api/v1/kyc") return json({ success: true, message: "Demo identity status", data: { status: "NOT_STARTED", sessionId: null, hostedUrl: null, explanation: "Identity verification needs the live server and is unavailable in demo mode." } });
    if (path === "/api/v1/agent/operations") return json(Object.values(operations));
    if (path.startsWith("/api/v1/agent/operations/customer?")) return json({ id: 1, name: "Demo Customer" });
    if (path.startsWith("/api/v1/agent/operations/")) {
      const reference = decodeURIComponent(path.split("/").pop()!);
      if (!reference.startsWith("DEMO-")) return json({ message: "Use a DEMO- reference in demo mode." }, 400);
      return json(operations[reference] ?? { operation: "DEPOSIT", reference, walletId: 1, walletName: "Demo wallet", createdAt:new Date().toISOString(), amount: 250, currency: "GMD", status: "AWAITING_AGENT", userId: 1, merchantName: "Demo Customer" });
    }
  }
  if (method === "POST" && path === "/api/v1/wallets") {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 60 || !/^[A-Z]{3}$/.test(body.currency)) return json({ message: "Enter a wallet name and currency." }, 400);
    const wallet = { id: ++sequence, name: body.name.trim(), currency: body.currency, status: "ACTIVE", ownerId: 1, ledgerAccountCode: "DEMO" };
    wallets.push(wallet); extraBalances[wallet.id] = 0; return json(wallet, 201);
  }
  if (method === "POST" && path === "/api/v1/support") {
    const ticket = { id: ++sequence, subject: body.subject, message: body.message, status: "OPEN", staffReply: "Demo ticket only. This message was not sent to staff." };
    tickets.unshift(ticket); return json(ticket, 201);
  }
  if (method === "POST" && /\/agent\/operations\/DEMO-[^/]+\/complete$/.test(path)) {
    const reference = decodeURIComponent(path.split("/").at(-2)!);
    const operation = operations[reference] ?? { operation: "DEPOSIT", reference, walletId: 1, walletName: "Demo wallet", createdAt:new Date().toISOString(), amount: 250, currency: "GMD", userId: 1, merchantName: "Demo Customer" };
    if (operation.status !== "COMPLETED") {
      const delta = Number(operation.amount);
      const walletId = Number(operation.walletId);
      if (operation.operation === "WITHDRAWAL" && delta > walletBalance(walletId)) return json({ message: "Insufficient demo balance." }, 400);
      setWalletBalance(walletId, walletBalance(walletId) + (operation.operation === "WITHDRAWAL" ? -delta : delta));
      operation.status = "COMPLETED"; operation.completedAt = new Date().toISOString();
    }
    transactions = transactions.map((item) => item.reference === reference ? { ...item, status: "COMPLETED" } : item);
    operations[reference] = operation; return json(operation);
  }
  if (method === "POST" && ["/api/v1/transfers", "/api/v1/deposits", "/api/v1/withdrawals"].includes(path)) {
    if (path === "/api/v1/transfers" && body.recipientPhone !== undefined) {
      let phone = String(body.recipientPhone).trim().replace(/[\s().-]/g, "");
      if (phone.startsWith("00")) phone = "+" + phone.slice(2);
      if (/^\d{7}$/.test(phone)) phone = "+220" + phone;
      else if (/^\d{8,15}$/.test(phone)) phone = "+" + phone;
      if (phone !== "+2207000002") return json({ message: "Demo recipient not found. Use +220 700 0002 to try a transfer." }, 400);
      const source = wallets.find(item => item.id === Number(body.sourceWalletId ?? 1));
      if (source?.currency !== "GMD") return json({ message: "Demo recipient has no active wallet in this currency." }, 400);
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return json({ message: "Enter a valid demo amount." }, 400);
    const walletId = Number(body.walletId ?? body.sourceWalletId ?? 1);
    const wallet = wallets.find((item) => item.id === walletId);
    if (!wallet) return json({ message: "Choose a demo wallet." }, 400);
    const debit = path !== "/api/v1/deposits";
    if (debit && amount > walletBalance(walletId)) return json({ message: "Insufficient demo balance." }, 400);
    const type = path.endsWith("deposits") ? "DEPOSIT" : path.endsWith("withdrawals") ? "WITHDRAWAL" : "TRANSFER";
    const cash = type !== "TRANSFER" && (body.userId || (type === "DEPOSIT" ? !body.paymentMethod || body.paymentMethod === "agent" : !body.withdrawalMethod || body.withdrawalMethod === "agent"));
    const reference = `DEMO-${++sequence}`;
    const operation = { id: sequence, reference, operation: type, type, walletId, walletName: wallet.name, amount, currency: wallet.currency, status: cash ? "AWAITING_AGENT" : "COMPLETED", userId: 1, merchantName: "Demo Customer", description: "Simulated operation — no real money", createdAt: new Date().toISOString() };
    if (!cash) setWalletBalance(walletId, walletBalance(walletId) + (debit ? -amount : amount));
    transactions.unshift({ ...operation, status: cash ? "PENDING" : operation.status, sourceWalletId: debit ? walletId : undefined }); operations[reference] = operation;
    return json(type === "TRANSFER" ? { transaction: operation, idempotentReplay: false } : operation);
  }
  return json({ message: "This feature needs the live server and is unavailable in demo mode." }, 503);
}
async function boundedFetch(url: string, init?: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<Response>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Request timed out")); }, timeoutMs);
  });
  try { return await Promise.race([fetch(url, { ...init, signal: controller.signal }), deadline]); }
  finally { if (timer) clearTimeout(timer); }
}
export async function serverAvailable(): Promise<boolean> {
  try { return (await boundedFetch(`${API_BASE}/actuator/health/liveness`, undefined, 10000)).status < 500; }
  catch { return false; }
}
export async function recoverLiveConnection(): Promise<void> {
  const current = generation;
  if (active && await serverAvailable() && generation === current) setDemoMode(false);
}
export async function availabilityFetch(url: string, init?: RequestInit): Promise<Response> {
  const path = url.startsWith(API_BASE) ? url.slice(API_BASE.length) : url;
  if (active) return demoResponse(path, init);
  const requestGeneration = generation;
  let response: Response;
  try {
    response = await boundedFetch(url, init);
  } catch {
    setDemoMode(true);
    // Never replay an uncertain live write as a successful simulation.
    throw new Error("Server unavailable. Demo mode opened. Any submitted live operation is unconfirmed; check its status when the server returns.");
  }
  if (generation !== requestGeneration) throw new Error("Connection mode changed. Check the status of any live operation after signing in again.");
  if (response.status >= 500) {
    throw new Error("Service temporarily unavailable. Your request may be unconfirmed; check its status before trying again.");
  }
  return response;
}
