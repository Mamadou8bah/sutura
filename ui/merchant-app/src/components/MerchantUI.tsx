import { Platform } from "react-native";
import { NativeSelect } from "./NativeControls";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useMerchant } from "../context/MerchantContext";
import { fonts } from "../theme";
export function money(value: number, currency: string, hidden = false) { return hidden ? "••••" : `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`; }
export function Heading({ title, subtitle }: {
    title: string;
    subtitle?: string;
}) { const { colors } = useTheme(); return <View style={{ gap: 8, marginBottom: 8 }}><Text style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.primary }}>{title}</Text>{subtitle && <Text style={{ fontFamily: fonts.regular, color: colors.slate500, fontSize: 13, lineHeight: 20 }}>{subtitle}</Text>}</View>; }
export function DataNotice() { const { colors } = useTheme(); const { loading, error, refresh } = useMerchant(); return <>{!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800, lineHeight: 20 }}>{error}</Text>}<Pressable accessibilityRole="button" accessibilityLabel="Refresh merchant data" disabled={loading} onPress={() => void refresh()} style={{ alignSelf: "flex-start", flexDirection: "row", gap: 8, paddingVertical: 8 }}><Ionicons name="refresh-outline" size={16} color={colors.slate500}/><Text style={{ fontFamily: fonts.medium, color: colors.slate500, fontSize: 12 }}>{loading ? "Refreshing…" : "Refresh"}</Text></Pressable></>; }
export function Empty({ title, hint }: {
    title: string;
    hint: string;
}) { const { colors } = useTheme(); return <View style={{ padding: 24, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: 16, alignItems: "center", gap: 12 }}><Ionicons name="receipt-outline" size={32} color={colors.orange}/><Text style={{ fontFamily: fonts.bold, color: colors.primary, fontSize: 17, textAlign: "center" }}>{title}</Text><Text style={{ fontFamily: fonts.regular, color: colors.slate500, fontSize: 12, lineHeight: 20, textAlign: "center" }}>{hint}</Text></View>; }
export function WalletSelect() { const { wallets, selectedId, selectWallet, hidden } = useMerchant(); const { colors } = useTheme(); if (Platform.OS !== "web") return <NativeSelect title="Collections wallet" value={String(selectedId)}
  options={wallets.filter(wallet => wallet.status === "ACTIVE").map(wallet => ({ value: String(wallet.id), label: `${wallet.name} · ${money(wallet.balance ?? 0, wallet.currency, hidden)}` }))}
  onChange={value => selectWallet(Number(value))} disabled={!wallets.some(wallet => wallet.status === "ACTIVE")} />;
  return <View style={{ gap: 4 }}>{wallets.filter(w => w.status === "ACTIVE").map(w => <Pressable accessibilityRole="radio" accessibilityLabel={`${w.name}, ${w.currency}`} accessibilityState={{ checked: w.id === selectedId }} key={w.id} onPress={() => selectWallet(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ flex: 1, gap: 4 }}><Text style={{ fontFamily: fonts.medium, color: colors.primary }}>{w.name}</Text><Text style={{ color: colors.slate500, fontSize: 12 }}>{money(w.balance ?? 0, w.currency, hidden)}</Text></View><Ionicons name={w.id === selectedId ? "checkmark-circle" : "ellipse-outline"} size={22} color={w.id === selectedId ? colors.orange : colors.slate500}/></Pressable>)}</View>; }
