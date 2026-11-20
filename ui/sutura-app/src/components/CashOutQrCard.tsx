import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "../api/client";
import type { AgentQrPayload } from "../types";
import { useTheme } from "../context/ThemeContext";
import { NativeText as Text } from "./NativeControls";
import { PrimaryButton } from "./ui";
import { formatMoney } from "../utils/format";
import { fonts } from "../theme";

export function CashOutQrCard({ payload }: { payload: AgentQrPayload }) {
  const { colors } = useTheme();
  const [qr, setQr] = useState<{token:string|null; expiresAt:string|null; status:string}|null>(null);
  const [now, setNow] = useState(Date.now());
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const retryAt = useRef(0);
  const active = useRef(true);
  async function refresh() {
    if (inFlight.current || !active.current) return;
    inFlight.current = true; setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const value = await api.cashOutQr(payload.reference, controller.signal);
      if (controller.signal.aborted || !active.current) return;
      if (!value || typeof value.status !== "string" || (value.token && (!/^[A-Za-z0-9_-]{43}$/.test(value.token) || !Number.isFinite(Date.parse(value.expiresAt ?? "")))))
        throw new Error("Could not load a secure QR. Try again.");
      setQr(value); setError(""); retryAt.current = ["SCANNED", "PENDING_REVIEW"].includes(value.status) ? Date.now() + 5000 : 0;
    } catch (err) {
      if (!controller.signal.aborted && active.current) { setQr(null); setError("QR unavailable. Reconnect to show a fresh code."); retryAt.current = Date.now() + 5000; }
    } finally {
      if (request.current === controller) { inFlight.current = false; if (active.current) setBusy(false); }
    }
  }
  useEffect(() => {
    active.current = true; setQr(null); retryAt.current = 0; setNow(Date.now());
    const listener = AppState.addEventListener("change", state => {
      setForeground(state === "active"); setQr(null); setNow(Date.now()); retryAt.current = 0;
      if (state !== "active") { request.current?.abort(); request.current = null; inFlight.current = false; }
    });
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { active.current = false; request.current?.abort(); request.current = null; inFlight.current = false; clearInterval(tick); listener.remove(); };
  }, [payload.reference]);
  const expires = Date.parse(qr?.expiresAt ?? "");
  const terminal = qr && ["COMPLETED", "FAILED", "REJECTED", "PROCESSING"].includes(qr.status);
  useEffect(() => {
    if (foreground && !terminal && now >= retryAt.current && (!qr || !Number.isFinite(expires) || expires <= now || qr.status === "SCANNED")) void refresh();
  }, [now, foreground, payload.reference, qr?.status]);
  const visible = foreground && qr?.token && expires > now;
  return <View style={{ gap: 12, alignItems: "center", backgroundColor: colors.surfaceMuted, borderRadius: 20, padding: 20 }}>
    <Text style={{fontFamily:fonts.semibold,fontSize:18,color:colors.primary}}>Cash-out QR</Text>
    <Text style={{fontFamily:fonts.semibold,fontSize:20,color:colors.primary}}>{formatMoney(Number(payload.amount),payload.currency)}</Text>
    {visible ? <View style={{padding:12,backgroundColor:"#fff",borderRadius:16}}><QRCode value={JSON.stringify({app:"sutura",v:2,operation:"WITHDRAWAL",reference:payload.reference,token:qr.token,expiresAt:qr.expiresAt})} size={180}/></View> : null}
    <Text accessibilityLiveRegion="polite" style={{color:colors.slate500,textAlign:"center",lineHeight:21}}>
      {qr?.status === "SCANNED" ? "The agent is reviewing your cash-out." : qr?.status === "PENDING_REVIEW" ? "Awaiting review. A fresh QR will appear after approval." : terminal ? qr.status === "COMPLETED" ? "Cash-out completed. Check your receipt in Activity." : "This cash-out is not ready. Check its status in Activity." : visible ? `Show this code to the agent. Refreshes in ${Math.min(30,Math.max(0,Math.ceil((expires-now)/1000)))}s.` : error || "Preparing a fresh QR…"}
    </Text>
    {!terminal && !visible && !["SCANNED","PENDING_REVIEW"].includes(qr?.status ?? "") && <PrimaryButton label="Refresh QR" loading={busy} disabled={busy} onPress={() => void refresh()}/>}
    <Text style={{color:colors.slate500,fontSize:12,textAlign:"center"}}>Keep this screen open. Only share the code with the agent serving you.</Text>
  </View>;
}
