import { WalletSurface } from "./WalletSurface";
import { StyleSheet, View } from "react-native";
import { NativePressable, NativeText as Text } from "./NativeControls";
import { Money } from "./Money";
import { useThemedStyles } from "../context/ThemeContext";
import { fonts, type, type ThemeColors } from "../theme";
import type { AgentOperation, AgentStats } from "../types";

/** Completed cash today, per currency. Different currencies are never summed. */
function totalsByCurrency(rows: AgentOperation[]) {
  const map = new Map<string, { cashIn: number; cashOut: number }>();
  for (const op of rows) {
    const entry = map.get(op.currency) ?? { cashIn: 0, cashOut: 0 };
    if (op.operation === "DEPOSIT") entry.cashIn += op.amount; else entry.cashOut += op.amount;
    map.set(op.currency, entry);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function StatsCarousel({ stats, completed, onOpenQueue, unavailable = false }: { unavailable?: boolean; stats: AgentStats; completed: AgentOperation[]; onOpenQueue: () => void }) {
  const styles = useThemedStyles(createStyles);
  const today = new Date().toDateString();
  const totals = totalsByCurrency(completed.filter(op => new Date(op.completedAt ?? op.createdAt).toDateString() === today));
  return <WalletSurface style={{ padding: 16 }}>
    <View style={styles.content}>
    <View style={styles.heading}><View style={{ gap: 4 }}><Text style={styles.label}>Today</Text><Text style={styles.caption}>Completed operations</Text></View><Text style={styles.count}>{unavailable ? "—" : stats.completedToday}</Text></View>
    {!unavailable && totals.map(([currency, t]) => <View key={currency} style={styles.metrics}>
      <View style={styles.metric}><Text style={styles.label}>Cash-in</Text><Money amount={t.cashIn} currency={currency} style={styles.value} /></View>
      <View style={styles.metric}><Text style={styles.label}>Cash-out</Text><Money amount={t.cashOut} currency={currency} style={styles.value} /></View>
    </View>)}
    {!unavailable && stats.pendingCount > 0 && <NativePressable accessibilityRole="button" accessibilityLabel={`View ${stats.pendingCount} pending operations`}
      onPress={onOpenQueue} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={styles.pending}>{stats.pendingCount} awaiting action</Text>
    </NativePressable>}
    </View>
  </WalletSurface>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 12 },
  caption: { fontSize: type.body, fontFamily: fonts.medium, color: colors.walletInk },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  pending: { color: colors.accentText, fontSize: type.body, fontWeight: "600" },
  label: { fontSize: type.caption, color: colors.walletMuted },
  count: { fontSize: 32, fontFamily: fonts.semibold, fontWeight: "600", color: colors.walletInk },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metric: { flexGrow: 1, flexBasis: 90, minWidth: 0, gap: 4 },
  value: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.walletInk, fontVariant: ["tabular-nums"] },
});
