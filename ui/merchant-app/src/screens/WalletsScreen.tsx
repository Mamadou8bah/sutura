import { BackHeader } from "../components/AppHeader";
import { useApp } from "../context/AppContext";
import { useRef, useState } from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Screen, Field, AppInput, PrimaryButton } from "../components/ui";
import { Heading, DataNotice, Empty, money } from "../components/MerchantUI";
import { SelectionSheet } from "../components/SelectionSheet";
import { useMerchant } from "../context/MerchantContext";
import { useTheme } from "../context/ThemeContext";
import { merchantApi } from "../api/operations";
import { fonts } from "../theme";
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
    return <Screen><BackHeader title="Wallets" onBack={() => setScreen("home")}/><Heading title="Business wallets" subtitle="Keep balances separate by currency."/><DataNotice />{wallets.map(w => <Pressable accessibilityRole="radio" accessibilityLabel={`Select ${w.name}`} accessibilityState={{ checked: w.id === selectedId, disabled: w.status !== "ACTIVE" }} disabled={w.status !== "ACTIVE"} key={w.id} onPress={() => selectWallet(w.id)} style={{ paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 17 }}>{w.name}</Text><Text style={{ color: colors.primary, fontFamily: fonts.medium }}>{money(w.balance ?? 0, w.currency, hidden)}</Text></View><Text style={{ color: w.id === selectedId ? colors.orange : colors.slate500, fontSize: 12 }}>{w.currency} · {w.id === selectedId ? "Selected" : w.status}</Text></Pressable>)}{!wallets.length && <Empty title="Your first business wallet" hint="Add a wallet to receive customer payments."/>}<PrimaryButton label="Add business wallet" onPress={() => { setError(""); setOpen(true); }}/>
 <SelectionSheet visible={open} title="Add business wallet" onClose={() => { if (!busy)
        setOpen(false); }}><View style={{ gap: 18 }}><Field label="Wallet name"><AppInput accessibilityLabel="Wallet name" value={name} onChangeText={setName} maxLength={60} editable={!busy} placeholder="e.g. Shop sales"/></Field><Field label="Currency"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["GMD", "USD", "EUR", "GBP", "XOF"].map(c => <Pressable accessibilityRole="radio" accessibilityLabel={c} accessibilityState={{ checked: currency === c }} disabled={busy} onPress={() => setCurrency(c)} key={c} style={{ padding: 12, borderRadius: 8, backgroundColor: currency === c ? colors.orangeLight : colors.surfaceMuted }}><Text style={{ color: colors.primary }}>{c}</Text></Pressable>)}</View></Field>{!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800 }}>{error}</Text>}<PrimaryButton label={busy ? "Creating…" : "Create business wallet"} disabled={busy} onPress={() => void create()}/></View></SelectionSheet></Screen>;
}
