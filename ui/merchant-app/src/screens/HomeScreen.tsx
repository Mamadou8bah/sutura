import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { Screen, SuturaLogo } from "../components/ui";
import { DataNotice, Empty, money } from "../components/MerchantUI";
import { useApp, type Screen as Route } from "../context/AppContext";
import { useMerchant } from "../context/MerchantContext";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../theme";
export function HomeScreen() {
    const { colors } = useTheme();
    const { session, setScreen } = useApp();
    const { wallets, selectedId, hidden, setHidden, transactions, collections } = useMerchant();
    const wallet = wallets.find(w => w.id === selectedId);
    return <Screen>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><SuturaLogo /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bold, color: colors.primary, fontSize: 20 }}>{session?.businessName || "Your business"}</Text><Text style={{ color: colors.slate500 }}>Merchant workspace</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => setScreen("settings")}><Ionicons name="settings-outline" size={24} color={colors.primary}/></Pressable></View><DataNotice />
    <View style={{ padding: 22, borderRadius: 16, backgroundColor: colors.surfaceMuted, gap: 16 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: colors.slate500 }}>Business balance</Text><Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Show balance" : "Hide balance"} onPress={() => setHidden(!hidden)}><Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary}/></Pressable></View><Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.primary }}>{wallet ? money(wallet.balance ?? 0, wallet.currency, hidden) : "—"}</Text><Pressable accessibilityRole="button" onPress={() => setScreen("wallets")}><Text style={{ color: colors.primary }}>{wallet?.name || "Add a business wallet"}  ›</Text></Pressable></View>
    <View style={{ flexDirection: "row", gap: 12 }}>{([['collections', 'qr-code-outline', 'Collect payment'], ['wallets', 'wallet-outline', 'Wallets']] as const).map(([route, icon, label]) => <Pressable accessibilityRole="button" key={route} onPress={() => setScreen(route)} style={{ flex: 1, padding: 20, gap: 16, borderRadius: 12, backgroundColor: colors.surfaceMuted }}><Ionicons name={icon} size={28} color={colors.orange}/><Text style={{ fontFamily: fonts.bold, color: colors.primary }}>{label}</Text></Pressable>)}</View>
    <Text style={{ fontFamily: fonts.bold, color: colors.primary, fontSize: 20 }}>Collections at a glance</Text><View style={{ flexDirection: "row", gap: 12 }}>{["ACTIVE", "PAID", "REVIEW"].map(status => <View key={status} style={{ flex: 1, gap: 8, paddingVertical: 16 }}><Text style={{ fontFamily: fonts.bold, color: colors.primary, fontSize: 24 }}>{collections.filter(c => c.status === status).length}</Text><Text style={{ color: colors.slate500, fontSize: 12 }}>{status === "ACTIVE" ? "Awaiting payment" : status === "PAID" ? "Paid" : "Under review"}</Text></View>)}</View>
    <Pressable accessibilityRole="button" onPress={() => setScreen("activity")} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontFamily: fonts.bold, color: colors.primary, fontSize: 20 }}>Recent payments</Text><Text style={{ color: colors.slate500 }}>View all ›</Text></Pressable>{transactions.slice(0, 4).map(t => <Pressable accessibilityRole="button" key={t.id} onPress={() => setScreen("activity")} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}><Text style={{ color: colors.primary, fontFamily: fonts.medium }}>{t.description || t.type}</Text><Text style={{ color: colors.primary }}>{money(t.amount, t.currency, hidden)} · {t.status}</Text></Pressable>)}{!transactions.length && <Empty title="Ready for your first payment" hint="Create a collection QR for a customer to scan in Sutura."/>}</Screen>;
}
