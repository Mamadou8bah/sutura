import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { kycApi, type KycStatus } from "../api/kyc";
import { useWallet } from "../context/WalletContext";
import { colors, fonts, radii, spacing } from "../theme";
import type { TabId } from "../types";
const services: { label: string; icon: keyof typeof Ionicons.glyphMap; tab: TabId; category: string }[] = [
  { label: "My wallets", icon: "wallet-outline", tab: "wallets", category: "Payments" },
  { label: "Send money", icon: "swap-horizontal-outline", tab: "send", category: "Payments" },
  { label: "Top up", icon: "add-circle-outline", tab: "topup", category: "Payments" },
  { label: "Withdraw", icon: "cash-outline", tab: "withdraw", category: "Payments" },
  { label: "Activity", icon: "receipt-outline", tab: "activity", category: "Account" },
  { label: "Verification", icon: "shield-checkmark-outline", tab: "verification", category: "Account" },
  { label: "Support tickets", icon: "chatbubbles-outline", tab: "support", category: "Account" },
];
export function MoreScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { data, setTab, setProfileSection } = useWallet();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<KycStatus["status"] | null>(null);
  useEffect(() => { let active = true; kycApi.status().then(value => { if (active) setStatus(value.status); }).catch(() => {}); return () => { active = false; }; }, []);
  const openProfile = (section: "profile" | "settings") => { setProfileSection(section); setTab("profile"); };
  const filtered = services.filter(item => `${item.label} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Text style={styles.title}>More</Text><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => openProfile("settings")} style={styles.settings}><Ionicons name="settings-outline" size={23} color={colors.primary} /></Pressable></View>
    <Pressable accessibilityRole="button" accessibilityLabel="View personal account" style={styles.profile} onPress={() => openProfile("profile")}>
      <View style={styles.avatar}><Text style={styles.initial}>{data.session.name.trim().charAt(0).toUpperCase() || "S"}</Text></View>
      <View style={styles.profileBody}><Text numberOfLines={1} style={styles.name}>{data.session.name}</Text><Text style={styles.muted}>{data.session.phone || data.session.email || "Personal account"}</Text><Text style={styles.badge}>{status ? status.replace(/_/g, " ") : "View your account"}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
    </Pressable>
    <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.slate500} /><TextInput accessibilityLabel="Search services" maxLength={80} autoComplete="off" placeholder="Search services" placeholderTextColor={colors.slate500} value={query} onChangeText={setQuery} style={styles.searchInput} autoCorrect={false} />{query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")}><Ionicons name="close-circle" size={21} color={colors.slate500} /></Pressable>}</View>
    {["Payments", "Account"].map(category => { const items = filtered.filter(item => item.category === category); return items.length > 0 && <View key={category}><Text style={styles.section}>{category}</Text><View style={styles.grid}>{items.map(item => <Pressable accessibilityRole="button" accessibilityLabel={item.label} key={item.label} onPress={() => setTab(item.tab)} style={({ pressed }) => [styles.service, pressed && styles.pressed]}><View style={styles.serviceIcon}><Ionicons name={item.icon} size={25} color={colors.primary} /></View><Text style={styles.serviceLabel}>{item.label}</Text></Pressable>)}</View></View>; })}
    {filtered.length === 0 && <Text style={styles.empty}>No services found. Try another search.</Text>}
  </ScrollView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 24, gap: 16 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontFamily: fonts.bold, color: colors.primary }, settings: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  profile: { flexDirection: "row", gap: 14, alignItems: "center", paddingVertical: 4 }, avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary }, profileBody: { flex: 1, minWidth: 0 }, name: { fontFamily: fonts.bold, fontSize: 21, color: colors.primary },
  muted: { color: colors.slate500, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 3 }, badge: { color: colors.slate500, fontFamily: fonts.medium, fontSize: 10, marginTop: 7 },
  verification: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.orangeLight, borderRadius: radii.md }, menuLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, minHeight: 46 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: fonts.regular, color: colors.primary, fontSize: 14 },
  section: { fontFamily: fonts.bold, color: colors.primary, fontSize: 17, marginBottom: 12 }, grid: { flexDirection: "row", flexWrap: "wrap" },
  service: { width: "25%", alignItems: "center", paddingVertical: 10, paddingHorizontal: 3, borderRadius: radii.sm, gap: 9 }, serviceIcon: { height: 40, justifyContent: "center" },
  serviceLabel: { textAlign: "center", fontSize: 12, lineHeight: 17, fontFamily: fonts.medium, color: colors.primary }, pressed: { backgroundColor: colors.surfaceMuted }, empty: { textAlign: "center", color: colors.slate500, paddingVertical: 24 },
});
