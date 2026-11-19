import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { AppHeader } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { StatsCarousel } from "../components/StatsCarousel";
import { SkeletonBalance, SkeletonRows } from "../components/Skeleton";
import { StaleNotice } from "../components/StaleNotice";
import { useAgent } from "../context/AgentContext";
import { fonts, radii, spacing, type, type ThemeColors } from "../theme";

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { stats, completed, setTab, recentCompleted, openOperation, refreshHistory, historyError, historyLoading, lastUpdated } = useAgent();
  const firstLoad = historyLoading && !lastUpdated;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={historyLoading && !firstLoad} onRefresh={() => void refreshHistory()} />}>
      <AppHeader />

      {historyError ? <StaleNotice message={lastUpdated ? "Couldn't refresh operations." : "Couldn't load operations."}
        since={lastUpdated} busy={historyLoading} onRetry={() => void refreshHistory()} /> : null}

      {firstLoad ? <SkeletonBalance label="Loading today's totals" /> : <StatsCarousel stats={stats} completed={completed} onOpenQueue={() => setTab("queue")} />}

      <Text accessibilityRole="header" style={styles.sectionTitle}>Services</Text>
      <QuickActionGrid
        actions={[
          { label: "Cash-in", hint: "Deposit for a customer", artwork: "cash-in", onPress: () => setTab("new-deposit") },
          { label: "Cash-out", hint: "Withdraw for a customer", artwork: "cash-out", onPress: () => setTab("new-withdrawal") },
        ]}
      />

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Recent completions</Text>
        {recentCompleted.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="See all completed operations"
          onPress={() => setTab("activity")} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable> : null}
      </View>

      {firstLoad ? <SkeletonRows rows={3} label="Loading recent operations" /> : recentCompleted.length === 0 ? <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={28} color={colors.slate500} />
        <Text style={styles.emptyTitle}>No completed operations yet</Text>
        <Text style={styles.emptyHint}>Your completed cash-in and cash-out history appears here.</Text>
      </View> : recentCompleted.map(op => <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />)}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 24, gap: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: 8 },
  sectionTitle: { flex: 1, fontSize: type.section, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  seeAllBtn: { minHeight: 48, minWidth: 48, justifyContent: "center", paddingHorizontal: 4 },
  seeAll: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.accentText },
  empty: { paddingVertical: 20, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, fontSize: type.headline, textAlign: "center" },
  emptyHint: { color: colors.slate500, fontSize: type.body, textAlign: "center", lineHeight: 21 },
});
