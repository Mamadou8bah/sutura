import { Ionicons } from "@expo/vector-icons";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { WalletOverview } from "../components/WalletOverview";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ScreenTitle } from "../components/AppHeader";
import { PrimaryButton } from "../components/ui";
import { SecondaryButton } from "../components/Review";
import { StaleNotice } from "../components/StaleNotice";
import { useWallet } from "../context/WalletContext";
import { fonts, radii, spacing, type, type ThemeColors } from "../theme";

export function WalletsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data, setTab, setSelectedWalletId, selectedWalletId, balanceHidden, loading, loaded, refreshData, refreshError, lastUpdated } = useWallet();
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={() => void refreshData()} tintColor={colors.slate500} colors={[colors.orange]} />}>
    <ScreenTitle title="Wallets" />
    {refreshError ? <StaleNotice message={refreshError} since={lastUpdated} busy={loading} onRetry={() => void refreshData()} /> : null}
    {data.wallets.length > 0 && <View style={styles.card}><WalletOverview selectable={false} /></View>}
    {data.wallets.length > 0 && <View style={styles.actions}>
      {[{ label: "Top up", tab: "topup" as const }, { label: "Withdraw", tab: "withdraw" as const }, { label: "Send", tab: "send" as const }].map(action =>
        <View key={action.tab} style={styles.action}><SecondaryButton label={action.label} onPress={() => setTab(action.tab)} /></View>)}
    </View>}
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Your balances</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Add new wallet" onPress={() => setTab("create-wallet")} style={styles.add}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </Pressable>
    </View>
    {data.wallets.length === 0 && <Text style={styles.empty}>No wallets yet. Create your first wallet to hold a balance.</Text>}
    {data.wallets.map(wallet => {
      const selected = wallet.id === selectedWalletId;
      return <Pressable key={wallet.id} accessibilityRole="radio" accessibilityState={{ checked: selected }}
        accessibilityLabel={`${wallet.name}, ${wallet.currency}`} onPress={() => setSelectedWalletId(wallet.id)} style={styles.row}>
        <View style={styles.currency}><Text style={styles.currencyText}>{wallet.currency}</Text></View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{wallet.name}</Text>
          {wallet.status !== "ACTIVE" ? <StatusPill status={wallet.status} plain /> : <Text style={styles.rowMeta}>{wallet.currency} wallet</Text>}
        </View>
        <View style={styles.rowRight}>
          <Money amount={wallet.balance} currency={wallet.currency} hidden={balanceHidden} style={styles.rowAmount} />
          {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accentText} accessibilityLabel="Selected" /> : null}
        </View>
      </Pressable>;
    })}
    {data.wallets.length === 0 && <PrimaryButton label="Create wallet" onPress={() => setTab("create-wallet")} />}
  </ScrollView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: spacing.section, gap: spacing.gap },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16 },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  sectionTitle: { color: colors.primary, fontSize: type.section, lineHeight: 28, fontFamily: fonts.semibold, fontWeight: "600" },
  add: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.slate500, textAlign: "center", paddingVertical: 24, fontSize: type.body },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  currency: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  currencyText: { fontFamily: fonts.semibold, fontWeight: "600", fontSize: 12, color: colors.primary },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: colors.primary, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body },
  rowMeta: { color: colors.slate500, fontSize: type.caption },
  rowRight: { alignItems: "flex-end", gap: 4, maxWidth: "50%" },
  rowAmount: { color: colors.primary, fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.body, textAlign: "right" },
});
