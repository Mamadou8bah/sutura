import { useRef, useState } from "react";
import { Share, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { Screen, AppInput, Field, PrimaryButton } from "../components/ui";
import { SelectionSheet } from "../components/SelectionSheet";
import { Heading, DataNotice, Empty, WalletSelect, money } from "../components/MerchantUI";
import { useTheme } from "../context/ThemeContext";
import { useMerchant } from "../context/MerchantContext";
import { merchantApi, type Collection } from "../api/operations";
import { isAmountDraft, isValidAmount } from "../utils/inputValidation";
import { fonts } from "../theme";
export function CollectionsScreen() {
    const { colors } = useTheme();
    const { wallets, selectedId, collections, refresh, hidden } = useMerchant();
    const [creating, setCreating] = useState(false);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [days, setDays] = useState(7);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const [selected, setSelected] = useState<Collection | null>(null);
    const [filter, setFilter] = useState("All");
    const wallet = wallets.find(w => w.id === selectedId);
    async function create() { if (lock.current)
        return; if (!wallet || wallet.status !== "ACTIVE") {
        setError("Choose an active wallet to receive payment.");
        return;
    } if (!isValidAmount(amount)) {
        setError("Enter a positive amount with up to four decimal places.");
        return;
    } lock.current = true; setBusy(true); setError(""); try {
        const result = await merchantApi.createCollection({ walletId: wallet.id, amount, currency: wallet.currency, description: description.trim(), expiresDays: days });
        setSelected(result);
        setCreating(false);
        setAmount("");
        setDescription("");
        await refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Could not create payment QR.");
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    async function check() { if (!selected || lock.current)
        return; lock.current = true; setBusy(true); setError(""); try {
        setSelected(await merchantApi.collection(selected.reference));
        await refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Could not check payment status.");
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    return <Screen><Heading title="Collections" subtitle="Create a payment QR and track its status."/><PrimaryButton label="Create payment QR" onPress={() => { setError(""); setCreating(true); }}/><DataNotice /><View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: colors.border }}>{["All", "Active", "Paid", "Review"].map(item => <Pressable accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} key={item} style={{ paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: filter === item ? colors.orange : "transparent" }}><Text style={{ fontFamily: fonts.medium, color: filter === item ? colors.primary : colors.slate500 }}>{item}</Text></Pressable>)}</View>
 {collections.filter(c => filter === "All" || c.status === filter.toUpperCase()).map(c => <Pressable accessibilityRole="button" accessibilityLabel={`Open collection ${c.reference}`} onPress={() => { setError(""); setSelected(c); }} key={c.reference} style={{ paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.primary }}>{money(Number(c.amount), c.currency, hidden)}</Text><Text style={{ color: c.status === "PAID" ? colors.emerald700 : colors.slate500, fontSize: 12 }}>{c.status}</Text></View><Text numberOfLines={1} style={{ color: colors.slate500, fontSize: 12 }}>{c.description || c.reference}</Text></Pressable>)}
 {!collections.some(c => filter === "All" || c.status === filter.toUpperCase()) && <Empty title="No collections here" hint="Create a QR code for your next customer. Paid and pending collections stay in this list."/>}
 <SelectionSheet visible={creating} title="Create payment QR" onClose={() => { if (!busy)
        setCreating(false); }}><View style={{ gap: 18 }}><Field label="Receive into"><WalletSelect /></Field><Field label={`Amount${wallet ? ` (${wallet.currency})` : ""}`}><AppInput accessibilityLabel="Collection amount" value={amount} onChangeText={v => { if (isAmountDraft(v))
        setAmount(v); }} inputMode="decimal" keyboardType="decimal-pad" maxLength={18} placeholder="0.00" editable={!busy}/></Field><Field label="Description (optional)"><AppInput accessibilityLabel="Collection description" value={description} onChangeText={setDescription} maxLength={200} placeholder="e.g. Order 1042" editable={!busy}/></Field><Field label="Expires after"><View style={{ flexDirection: "row", gap: 8 }}>{[1, 7, 30].map(value => <Pressable accessibilityRole="radio" accessibilityLabel={`${value} days`} accessibilityState={{ checked: days === value }} disabled={busy} key={value} onPress={() => setDays(value)} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: days === value ? colors.orangeLight : colors.surfaceMuted }}><Text style={{ color: colors.primary, textAlign: "center" }}>{value} days</Text></Pressable>)}</View></Field>{!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800 }}>{error}</Text>}<PrimaryButton label={busy ? "Creating…" : "Generate merchant QR"} disabled={busy} onPress={() => void create()}/></View></SelectionSheet>
 <SelectionSheet visible={!!selected && !creating} title="Payment QR" onClose={() => { if (!busy)
        setSelected(null); }}>{selected && <View style={{ gap: 18, alignItems: "stretch" }}><Text style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.primary, textAlign: "center" }}>{money(Number(selected.amount), selected.currency, hidden)}</Text>{selected.status === "ACTIVE" && <View accessibilityLabel="Merchant payment QR" style={{ backgroundColor: "#ffffff", padding: 18, borderRadius: 12, alignSelf: "center" }}><QRCode value={selected.reference} size={190}/></View>}<Text style={{ color: selected.status === "PAID" ? colors.emerald700 : colors.primary, fontFamily: fonts.medium, textAlign: "center" }}>{selected.status === "PAID" ? "Payment received" : selected.status === "REVIEW" ? "Payment under review" : selected.status}</Text><Text style={{ color: colors.slate500, textAlign: "center", lineHeight: 20 }}>{selected.description || "Ask your customer to scan this QR using Sutura."}</Text><Text selectable style={{ color: colors.slate500, fontSize: 12, textAlign: "center" }}>{selected.reference}</Text>{selected.expiresAt && <Text style={{ color: colors.slate500, fontSize: 12, textAlign: "center" }}>Expires {new Date(selected.expiresAt).toLocaleString()}</Text>}{!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800 }}>{error}</Text>}<PrimaryButton label={busy ? "Checking…" : "Check payment status"} disabled={busy} onPress={() => void check()}/>{selected.status === "ACTIVE" && <PrimaryButton label="Share payment reference" disabled={busy} color={colors.primary} onPress={() => { void Share.share({ message: `Sutura payment: ${money(Number(selected.amount), selected.currency)}. Reference: ${selected.reference}` }).catch(() => setError("Could not open sharing.")); }}/>}</View>}</SelectionSheet>
 </Screen>;
}
