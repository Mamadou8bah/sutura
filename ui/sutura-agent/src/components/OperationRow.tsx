import { useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Money } from "./Money";
import { StatusPill, statusLabel } from "./StatusPill";
import { fonts, type } from "../theme";
import type { AgentOperation } from "../types";
import { formatMoney, operationLabel } from "../utils/format";

function activityTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
  return date.toDateString() === new Date().toDateString() ? `Today, ${time}` : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

export function OperationRow({ op, onPress }: { op: AgentOperation; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const isDeposit = op.operation === "DEPOSIT";
  const name = op.merchantName || op.walletName || "Customer";
  const complete = op.status === "COMPLETED";
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${operationLabel(op.operation)}, ${name}, ${formatMoney(op.amount, op.currency)}, ${statusLabel(op.status)}`}
      accessibilityHint="Opens the operation" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.badge}>
        <Ionicons name={isDeposit ? "arrow-down" : "arrow-up"} size={20} color={styles.icon.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.meta} numberOfLines={2}>{operationLabel(op.operation)} · {activityTime(op.completedAt ?? op.createdAt)}</Text>
        {!complete && <View style={styles.status}><StatusPill status={op.status} plain /></View>}
      </View>
      <View style={styles.right}>
        <Money amount={op.amount} currency={op.currency} sign={isDeposit ? "+" : "−"} style={styles.amount} />

      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 },
  pressed: { opacity: 0.88 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  icon: { color: colors.primary },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.primary },
  meta: { fontSize: type.caption, lineHeight: 18, color: colors.slate500 },
  status: { marginTop: 4 },
  right: { alignItems: "flex-end", maxWidth: "45%", gap: 2 },
  amount: { fontSize: type.body, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, textAlign: "right" },
});
