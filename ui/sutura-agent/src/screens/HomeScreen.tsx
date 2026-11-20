import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { KeyboardScrollView as ScrollView } from "../components/KeyboardScrollView";
import { RefreshControl, StyleSheet, View} from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { AppHeader } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { WalletSurface } from "../components/WalletSurface";
import { StatsCarousel } from "../components/StatsCarousel";
import { SkeletonBalance, SkeletonRows } from "../components/Skeleton";
import { useAgent } from "../context/AgentContext";
import { fonts, spacing, type, type ThemeColors } from "../theme";

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { stats, completed, setTab, recentCompleted, openOperation, refreshHistory, historyError, historyLoading, lastUpdated } = useAgent();
  const firstLoad = historyLoading && !lastUpdated;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={historyLoading && !firstLoad} onRefresh={() => void refreshHistory()} />}>
      <AppHeader />

      {firstLoad ? <WalletSurface><SkeletonBalance label="Loading today's totals" /></WalletSurface> : <StatsCarousel unavailable={!lastUpdated && !!historyError} stats={stats} completed={completed} onOpenQueue={() => setTab("queue")} />}

      <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Services</Text>
      <QuickActionGrid
        actions={[
          { label: "Cash-in", hint: "Deposit for a customer", artwork: "cash-in", onPress: () => setTab("new-deposit") },
          { label: "Cash-out", hint: "Withdraw for a customer", artwork: "cash-out", onPress: () => setTab("new-withdrawal") },
        ]}
      />

      </View>

      <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Recent completions</Text>
        {recentCompleted.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="See all completed operations"
          onPress={() => setTab("activity")} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable> : null}
      </View>

      {firstLoad ? <SkeletonRows rows={3} label="Loading recent operations" /> : recentCompleted.length === 0 ? <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={28} color={colors.slate500} />
        <Text style={styles.emptyTitle}>{!lastUpdated && historyError ? "No operations loaded" : "No completed operations yet"}</Text>
        <Text style={styles.emptyHint}>{!lastUpdated && historyError ? "Pull down to load your operations." : "Completed cash-in and cash-out operations appear here."}</Text>
      </View> : <View style={styles.activity}>{recentCompleted.map(op => <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />)}</View>}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 16, gap: 20 },
  section: { gap: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: type.section, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  seeAllBtn: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 4 },
  seeAll: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.accentText },
  activity: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12 },
  empty: { paddingVertical: 20, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, fontSize: type.headline, textAlign: "center" },
  emptyHint: { color: colors.slate500, fontSize: type.body, textAlign: "center", lineHeight: 21 },
});
