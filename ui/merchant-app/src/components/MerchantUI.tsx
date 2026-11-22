import { Platform } from "react-native";
import { NativeSelect } from "./NativeControls";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useMerchant } from "../context/MerchantContext";
import { fonts, type } from "../theme";
import { formatBalance } from "../utils/format";
import { statusLabel } from "./StatusPill";
/** Deprecated alias kept for call sites: en-GB, 2 decimals, currency first (see utils/format). */
export function money(value: number, currency: string, hidden = false) { return formatBalance(Number(value), currency, hidden); }
export function Heading({ title, subtitle }: {
    title: string;
    subtitle?: string;
}) { const { colors } = useTheme(); return <View style={{ gap: 8, marginBottom: 8 }}><Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.title, lineHeight: 34, color: colors.primary }}>{title}</Text>{subtitle && <Text style={{ fontFamily: fonts.regular, color: colors.slate500, fontSize: type.body, lineHeight: 21 }}>{subtitle}</Text>}</View>; }
/** Manual refresh complements the background and pull-to-refresh reads. */
export function RefreshDataButton() { const { colors } = useTheme(); const { loading, refresh } = useMerchant(); return <Pressable accessibilityRole="button" accessibilityLabel="Refresh merchant data" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={() => void refresh()} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}><Ionicons name="refresh-outline" size={16} color={colors.slate500}/><Text style={{ fontFamily: fonts.medium, color: colors.slate500, fontSize: type.caption }}>Refresh</Text></Pressable>; }
export function Empty({ title, hint }: {
    title: string;
    hint: string;
}) { const { colors } = useTheme(); return <View style={{ padding: 24, borderWidth: 1, borderColor: colors.border, borderRadius: 16, alignItems: "center", gap: 12 }}><Ionicons name="receipt-outline" size={28} color={colors.slate500}/><Text style={{ fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, fontSize: type.headline, textAlign: "center" }}>{title}</Text><Text style={{ fontFamily: fonts.regular, color: colors.slate500, fontSize: type.caption, lineHeight: 19, textAlign: "center" }}>{hint}</Text></View>; }
export function WalletSelect() { const { wallets, selectedId, selectWallet, hidden } = useMerchant(); const { colors } = useTheme(); if (Platform.OS !== "web") return <NativeSelect title="Collections wallet" value={String(selectedId)}
  options={wallets.filter(wallet => wallet.status === "ACTIVE").map(wallet => ({ value: String(wallet.id), label: `${wallet.name} · ${money(wallet.balance ?? 0, wallet.currency, hidden)}` }))}
  onChange={value => selectWallet(Number(value))} disabled={!wallets.some(wallet => wallet.status === "ACTIVE")} />;
  return <View style={{ gap: 4 }}>{wallets.filter(w => w.status === "ACTIVE").map(w => <Pressable accessibilityRole="radio" accessibilityLabel={`${w.name}, ${w.currency}`} accessibilityState={{ checked: w.id === selectedId }} key={w.id} onPress={() => selectWallet(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ flex: 1, gap: 4 }}><Text style={{ fontFamily: fonts.medium, color: colors.primary }}>{w.name}</Text><Text style={{ color: colors.slate500, fontSize: 12 }}>{money(w.balance ?? 0, w.currency, hidden)}</Text></View><Ionicons name={w.id === selectedId ? "checkmark-circle" : "ellipse-outline"} size={22} color={w.id === selectedId ? colors.accentText : colors.slate500}/></Pressable>)}</View>; }
/** Collection labels: REVIEW reads "Under review"; everything else uses the shared status map. */
export function collectionLabel(status: string) { return String(status).toUpperCase() === "REVIEW" ? "Under review" : statusLabel(status); }
