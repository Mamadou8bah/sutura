import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { ScreenTitle } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { SkeletonRows } from "../components/Skeleton";
import { StaleNotice } from "../components/StaleNotice";
import { useAgent } from "../context/AgentContext";
import { fonts, radii, spacing, type, type ThemeColors } from "../theme";

export function ActivityScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { completed, openOperation, refreshHistory, historyError, historyLoading, lastUpdated } = useAgent();
  const firstLoad = historyLoading && !lastUpdated;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={historyLoading && !firstLoad} onRefresh={() => void refreshHistory()} />}
      contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTitle title="Activity" subtitle={`${completed.length} completed cash operation${completed.length === 1 ? "" : "s"}`} />
      {historyError ? <StaleNotice message={historyError} since={lastUpdated} busy={historyLoading} onRetry={() => void refreshHistory()} /> : null}
      {firstLoad ? <SkeletonRows rows={5} label="Loading activity" /> : completed.length === 0 ? <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={28} color={colors.slate500} />
        <Text style={styles.emptyTitle}>No completed operations yet</Text>
        <Text style={styles.emptyHint}>Completed cash-in and cash-out operations will appear here.</Text>
      </View> : completed.map(op => <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />)}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: 12 },
  empty: { padding: 24, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: type.headline, fontWeight: "600", color: colors.primary },
  emptyHint: { fontSize: type.body, lineHeight: 21, textAlign: "center", color: colors.slate500 },
});
