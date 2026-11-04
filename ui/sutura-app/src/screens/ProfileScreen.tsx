import { ThemePicker } from "../components/ThemePicker";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AccountMenuRow } from "../components/AccountMenuRow";
import { PrimaryButton } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { colors, fonts, spacing } from "../theme";

export function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { signOut } = useAuth();
  const { data, profileSection, setProfileSection, setTab, balanceHidden, toggleBalanceHidden, selectedWallet } = useWallet();
  const settings = profileSection === "settings";
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <BackHeader title={settings ? "Settings" : "Personal account"} onBack={() => setTab("more")} />
    {settings ? <>
      <Text style={styles.section}>Account</Text>
      <View><AccountMenuRow label="Personal account" icon="person-outline" onPress={() => setProfileSection("profile")} /></View>
      <Text style={styles.section}>Privacy</Text>
      <AccountMenuRow label="Hide balances" hint="Keep amounts private across your wallets" icon="eye-off-outline" trailing={<Switch accessibilityLabel="Hide balances" value={balanceHidden} onValueChange={toggleBalanceHidden} trackColor={{false: colors.border, true: colors.orange}} thumbColor={colors.white} />} />
      <Text style={styles.section}>General</Text>
      <View><AccountMenuRow label="Language" icon="language-outline" value="English" /></View>
      <Text style={styles.section}>Appearance</Text>
      <ThemePicker />
      <Text style={styles.section}>Help & about</Text>
      <View><AccountMenuRow label="Help & support" icon="help-circle-outline" onPress={() => setTab("support")} /><AccountMenuRow label="App version" icon="information-circle-outline" value="1.0.0" /></View>
      <PrimaryButton label="Log out" color={colors.surfaceMuted} textColor={colors.primary} onPress={() => { void signOut(); }} />
    </> : <>
      <View style={styles.hero}><View style={styles.avatar}><Text style={styles.initial}>{data.session.name.trim().charAt(0).toUpperCase() || "S"}</Text></View><Text style={styles.name}>{data.session.name}</Text><Text style={styles.subtitle}>Your Sutura account</Text></View>
      <AccountMenuRow label="Identity verification" hint="Document and face verification" icon="shield-checkmark-outline" onPress={() => setTab("verification")} />
      <Text style={styles.section}>Account information</Text>
      <View><AccountMenuRow label="Full name" icon="person-outline" value={data.session.name} /><AccountMenuRow label="Phone" icon="call-outline" value={data.session.phone || "Not provided"} /><AccountMenuRow label="Email" icon="mail-outline" value={data.session.email || "Not provided"} /><AccountMenuRow label="Address" icon="location-outline" value={data.session.address || "Not provided"} /></View>
      <AccountMenuRow label="Settings" icon="settings-outline" onPress={() => setProfileSection("settings")} />
      <AccountMenuRow label="Contact support" hint="Get help with your account details" icon="help-circle-outline" onPress={() => setTab("support")} />
    </>}
  </ScrollView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: 12 },
  section: { fontFamily: fonts.bold, fontSize: 13, color: colors.slate500, marginTop: 16 },
  hero: { alignItems: "center", paddingVertical: 18, gap: 8 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.bold, fontSize: 28, color: colors.primary }, name: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary }, subtitle: { fontFamily: fonts.regular, color: colors.slate500, fontSize: 13 },
});
