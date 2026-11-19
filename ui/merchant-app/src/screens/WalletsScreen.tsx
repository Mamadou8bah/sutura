import { BackHeader } from "../components/AppHeader";
import { useApp } from "../context/AppContext";
import { useRef, useState } from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Screen, Field, AppInput, PrimaryButton } from "../components/ui";
import { DataNotice, Empty } from "../components/MerchantUI";
import { SelectionSheet } from "../components/SelectionSheet";
import { useMerchant } from "../context/MerchantContext";
import { useTheme } from "../context/ThemeContext";
import { merchantApi } from "../api/operations";
import { fonts, type } from "../theme";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { Ionicons } from "@expo/vector-icons";
export function WalletsScreen() {
    const { setScreen } = useApp();
    const { colors } = useTheme();
    const { wallets, selectedId, selectWallet, refresh, hidden } = useMerchant();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState("GMD");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const lock = useRef(false);
    async function create() { if (lock.current)
        return; if (!name.trim()) {
        setError("Enter a wallet name.");
        return;
    } lock.current = true; setBusy(true); setError(""); try {
        const w = await merchantApi.createWallet(name.trim(), currency);
        await refresh();
        selectWallet(w.id);
        setOpen(false);
        setName("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Could not create wallet.");
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    return <Screen><BackHeader title="Business wallets" onBack={() => setScreen("home")}/><Text style={{ color: colors.slate500, fontSize: type.body, lineHeight: 21 }}>Keep balances separate by currency. The selected wallet receives new payments.</Text><DataNotice />{wallets.map(w => <Pressable accessibilityRole="radio" accessibilityLabel={`Select ${w.name}`} accessibilityState={{ checked: w.id === selectedId, disabled: w.status !== "ACTIVE" }} disabled={w.status !== "ACTIVE"} key={w.id} onPress={() => selectWallet(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: w.status === "ACTIVE" ? 1 : 0.7 }}><View style={{ flex: 1, gap: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><Text style={{ color: colors.primary, fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.headline, flexShrink: 1 }}>{w.name}</Text><Money amount={w.balance ?? 0} currency={w.currency} hidden={hidden} style={{ color: colors.primary, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body }}/></View><View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}><Text style={{ color: w.id === selectedId ? colors.accentText : colors.slate500, fontSize: type.caption, fontFamily: w.id === selectedId ? fonts.medium : fonts.regular }}>{w.currency}{w.id === selectedId ? " · Receives payments" : ""}</Text>{w.status !== "ACTIVE" && <StatusPill status={w.status}/>}</View></View><Ionicons name={w.id === selectedId ? "checkmark-circle" : "ellipse-outline"} size={22} color={w.id === selectedId ? colors.accentText : colors.slate400}/></Pressable>)}{!wallets.length && <Empty title="Your first business wallet" hint="Add a wallet to receive customer payments."/>}<PrimaryButton label="Add business wallet" onPress={() => { setError(""); setOpen(true); }}/>
 <SelectionSheet visible={open} title="Add business wallet" onClose={() => { if (!busy)
        setOpen(false); }}><View style={{ gap: 18 }}><Field label="Wallet name"><AppInput accessibilityLabel="Wallet name" value={name} onChangeText={setName} maxLength={60} editable={!busy} placeholder="e.g. Shop sales"/></Field><Field label="Currency"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["GMD", "USD", "EUR", "GBP", "XOF"].map(c => <Pressable accessibilityRole="radio" accessibilityLabel={c} accessibilityState={{ checked: currency === c }} disabled={busy} onPress={() => setCurrency(c)} key={c} style={{ minWidth: 64, minHeight: 44, justifyContent: "center", alignItems: "center", padding: 12, borderRadius: 8, borderWidth: currency === c ? 2 : 1, borderColor: currency === c ? colors.primary : colors.border, backgroundColor: currency === c ? colors.surface : colors.surfaceMuted }}><Text style={{ color: colors.primary, fontFamily: currency === c ? fonts.semibold : fonts.regular, fontWeight: currency === c ? "600" : "400" }}>{c}</Text></Pressable>)}</View></Field>{!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800 }}>{error}</Text>}<PrimaryButton loading={busy} label={busy ? "Creating…" : "Create business wallet"} disabled={busy} onPress={() => void create()}/></View></SelectionSheet></Screen>;
}
