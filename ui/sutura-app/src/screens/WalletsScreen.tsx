import { Ionicons } from "@expo/vector-icons";
import { NativePressable as Pressable } from "../components/NativeControls";
import { WalletOverview } from "../components/WalletOverview";
import { formatBalance } from "../utils/format";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { ScreenTitle } from "../components/AppHeader";
import { PrimaryButton } from "../components/ui";
import { useWallet } from "../context/WalletContext";
import { colors, spacing } from "../theme";
export function WalletsScreen() {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { data, setTab, setSelectedWalletId, selectedWalletId, balanceHidden } = useWallet();
    return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ScreenTitle title="Wallets"/>
      <WalletOverview deposit={false} selectable={false}/>
      {data.wallets.length > 0 && <View style={{ flexDirection: "row", gap: 10 }}>{[{ label: "Top up", tab: "topup" as const }, { label: "Withdraw", tab: "withdraw" as const }, { label: "Send", tab: "send" as const }].map(action => <View key={action.tab} style={{ flex: 1 }}><PrimaryButton label={action.label} color={colors.orange} textColor="#181a20" onPress={() => setTab(action.tab)}/></View>)}</View>}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}><Text style={{ color: colors.primary, fontSize: 19, fontWeight: "700" }}>Your balances</Text><Pressable accessibilityRole="button" accessibilityLabel="Add new wallet" onPress={() => setTab("create-wallet")} style={{ padding: 10 }}><Ionicons name="add" size={24} color={colors.primary}/></Pressable></View>
      {data.wallets.length === 0 && <Text style={styles.empty}>No wallets yet. Create your first wallet below.</Text>}
      {data.wallets.map(wallet => <Pressable key={wallet.id} accessibilityRole="button" accessibilityLabel={`Select ${wallet.name}`} onPress={() => setSelectedWalletId(wallet.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Text style={{ fontWeight: "700", fontSize: 11, color: colors.primary }}>{wallet.currency}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>{wallet.currency}</Text><Text style={{ color: colors.slate500, fontSize: 12 }}>{wallet.name}</Text></View><View style={{ alignItems: "flex-end", gap: 4 }}><Text style={{ color: colors.primary, fontWeight: "600" }}>{formatBalance(wallet.balance, wallet.currency, balanceHidden)}</Text><Text style={{ color: wallet.id === selectedWalletId ? colors.orange : colors.slate500, fontSize: 11 }}>{wallet.id === selectedWalletId ? "Selected" : wallet.status}</Text></View></Pressable>)}

      {data.wallets.length === 0 && <PrimaryButton label="Add new wallet" onPress={() => setTab("create-wallet")}/>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
    content: { padding: spacing.screen, paddingBottom: 32, gap: 16 },
    form: { gap: 16, paddingVertical: 8 },
    empty: { color: colors.slate500, textAlign: "center", paddingVertical: 24 },
    error: { color: colors.rose800, fontSize: 14 },
});
