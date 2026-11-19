import { useThemedStyles } from "../context/ThemeContext";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { ScreenTitle } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { SkeletonRows } from "../components/Skeleton";
import { StaleNotice } from "../components/StaleNotice";
import { useAgent } from "../context/AgentContext";
import { fonts, radii, spacing, type, type ThemeColors } from "../theme";

export function QueueScreen() {
  const styles = useThemedStyles(createStyles);
  const { pending, openOperation, refreshHistory, historyLoading, historyError, lastUpdated } = useAgent();
  const firstLoad = historyLoading && !lastUpdated && pending.length === 0;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={historyLoading && !firstLoad} onRefresh={() => void refreshHistory()} />}
      contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTitle title="Pending queue"
        subtitle={`${pending.length} operation${pending.length === 1 ? "" : "s"} awaiting completion`} />
      {historyError ? <StaleNotice message={historyError} since={lastUpdated} busy={historyLoading} onRetry={() => void refreshHistory()} /> : null}
      {firstLoad ? <SkeletonRows rows={4} label="Loading queue" /> : pending.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Queue is clear</Text>
          <Text style={styles.emptySub}>Scanned customer QR codes waiting for completion appear here. Pull down to refresh.</Text>
        </View>
      ) : (
        pending.map(op => <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />)
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: 12 },
  empty: { marginTop: 24, alignItems: "center", padding: 24, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, gap: 8 },
  emptyTitle: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  emptySub: { fontSize: type.body, lineHeight: 21, color: colors.slate500, textAlign: "center" },
});
