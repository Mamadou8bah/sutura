import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { kycApi, type KycStatus } from "../api/kyc";
import { StatusPill } from "../components/StatusPill";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing } from "../theme";
import { AccountMenuRow } from "../components/AccountMenuRow";
export function MoreScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { data, setTab, setProfileSection } = useWallet();
  const [status, setStatus] = useState<KycStatus["status"] | null>(null);
  const [statusError, setStatusError] = useState(false);
  useEffect(() => { let active = true; kycApi.status().then(value => { if (active) { setStatus(value.status); setStatusError(false); } }).catch(() => { if (active) setStatusError(true); }); return () => { active = false; }; }, []);
  const openProfile = (section: "profile" | "settings") => { setProfileSection(section); setTab("profile"); };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Text accessibilityRole="header" style={styles.title}>More</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="View personal account" style={styles.profile} onPress={() => openProfile("profile")}>
      <View style={styles.avatar}><Text style={styles.initial}>{data.session.name.trim().charAt(0).toUpperCase() || "S"}</Text></View>
      <View style={styles.profileBody}><Text numberOfLines={1} style={styles.name}>{data.session.name}</Text><Text style={styles.muted}>{data.session.phone || data.session.email || "Personal account"}</Text>{status ? <View style={styles.badge}><StatusPill status={status} label={status === "VERIFIED" ? "Identity verified" : status === "NOT_STARTED" ? "Identity not verified" : undefined} /></View> : <Text style={styles.muted}>{statusError ? "Couldn't load verification status." : "View your account"}</Text>}</View>
      <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
    </Pressable>
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={styles.section}>Your account</Text>
      <AccountMenuRow label="Identity verification" icon="shield-checkmark-outline" hint={statusError ? "Status unavailable. Tap to try again." : status === "VERIFIED" ? "Your identity is verified" : "Manage your document and face check"} onPress={() => setTab("verification")} />
      <AccountMenuRow label="Settings" icon="settings-outline" hint="Appearance, privacy and preferences" onPress={() => openProfile("settings")} />
    </View>
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={styles.section}>Help</Text>
      <AccountMenuRow label="Contact support" icon="chatbubbles-outline" hint="Get help and view your support tickets" onPress={() => setTab("support")} />
    </View>
  </ScrollView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 28, gap: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, lineHeight: 36, fontFamily: fonts.semibold, color: colors.primary },
  profile: { flexDirection: "row", gap: 14, alignItems: "center", padding: 18, backgroundColor: colors.surfaceMuted, borderRadius: 22 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.orangeLight, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.semibold, fontSize: 24, color: colors.accentText },
  profileBody: { flex: 1, minWidth: 0 }, name: { fontFamily: fonts.semibold, fontSize: 19, color: colors.primary },
  muted: { color: colors.slate500, fontSize: 13, lineHeight: 20, marginTop: 3 }, badge: { marginTop: 8 },
  section: { fontFamily: fonts.semibold, color: colors.slate500, fontSize: 13, marginBottom: 4 },
});
