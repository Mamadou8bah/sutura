import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { AppHeader } from "../components/AppHeader";
import { TransactionRow } from "../components/TransactionRow";
import { WalletSurface } from "../components/WalletSurface";
import { WalletOverview } from "../components/WalletOverview";
import { SkeletonBalance, SkeletonRows } from "../components/Skeleton";
import { StaleNotice } from "../components/StaleNotice";
import { PrimaryButton } from "../components/ui";
import { useWallet } from "../context/WalletContext";
import { fonts, radii, spacing, type, type ThemeColors } from "../theme";

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data, loading, loaded, setTab, recentTransactions, refreshData, refreshError, lastUpdated } = useWallet();
  const firstLoad = !loaded && data.wallets.length === 0;
  const refreshControl = <RefreshControl refreshing={loading && loaded} onRefresh={() => void refreshData()} tintColor={colors.slate500} colors={[colors.orange]} />;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
    <AppHeader />
    {refreshError ? <StaleNotice message={refreshError} since={lastUpdated} busy={loading} onRetry={() => void refreshData()} /> : null}
    {firstLoad ? <WalletSurface><SkeletonBalance /></WalletSurface>
      : data.wallets.length ? <WalletSurface><WalletOverview showDepositQr /></WalletSurface>
      : <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Create your first wallet</Text>
          <Text style={styles.muted}>A wallet holds your balance in one currency.</Text>
          <PrimaryButton label="Create wallet" onPress={() => setTab("create-wallet")} />
        </View>}
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Recent activity</Text>
      {recentTransactions.length > 0 && <Pressable accessibilityRole="link" accessibilityLabel="See all activity" onPress={() => setTab("activity")} style={styles.seeAll}>
        <Text style={styles.seeAllText}>See all</Text>
      </Pressable>}
    </View>
    {firstLoad ? <SkeletonRows rows={4} label="Loading activity" />
      : recentTransactions.length === 0 ? <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={24} color={colors.slate500} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptyHint}>Your payments and deposits will appear here.</Text>
      </View>
      : <View>{recentTransactions.map(transaction => <TransactionRow key={transaction.id} txn={transaction} />)}</View>}
  </ScrollView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: spacing.section, gap: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  cardTitle: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  muted: { fontSize: type.caption, lineHeight: 18, color: colors.slate500 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  action: { flex: 1, minWidth: 0, minHeight: 88, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderRadius: radii.lg, backgroundColor: colors.background },
  largeTextAction: { flexBasis: 120, flexGrow: 1 },
  actionTitle: { fontSize: type.caption, lineHeight: 20, fontFamily: fonts.medium, fontWeight: "500", color: colors.primary, textAlign: "center", alignSelf: "stretch" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 },
  sectionTitle: { fontSize: type.section, lineHeight: 28, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, flexShrink: 1 },
  seeAll: { minHeight: 48, minWidth: 48, justifyContent: "center", paddingHorizontal: 4 },
  seeAllText: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.accentText },
  empty: { paddingVertical: 16, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, textAlign: "center" },
  emptyHint: { fontSize: type.caption, lineHeight: 19, color: colors.slate500, textAlign: "center" },
});
