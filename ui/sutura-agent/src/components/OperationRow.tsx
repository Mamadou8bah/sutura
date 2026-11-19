import { useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Money } from "./Money";
import { StatusPill, statusLabel } from "./StatusPill";
import { fonts, type } from "../theme";
import type { AgentOperation } from "../types";
import { formatMoney, formatTimestamp, operationLabel } from "../utils/format";

export function OperationRow({ op, onPress }: { op: AgentOperation; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const isDeposit = op.operation === "DEPOSIT";
  const name = op.walletName || op.merchantName || "Customer";
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={`${operationLabel(op.operation)}, ${name}, ${formatMoney(op.amount, op.currency)}, ${statusLabel(op.status)}`}
      accessibilityHint="Opens the operation" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.badge}>
        <Ionicons name={isDeposit ? "arrow-down" : "arrow-up"} size={20} color={styles.icon.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <Text style={styles.meta}>{operationLabel(op.operation)} · {formatTimestamp(op.createdAt)}</Text>
        <View style={styles.status}><StatusPill status={op.status} plain /></View>
      </View>
      <View style={styles.right}>
        <Money amount={op.amount} currency={op.currency} sign={isDeposit ? "+" : "−"} style={styles.amount} />
        <Text numberOfLines={1} style={styles.ref}>{op.reference}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 0, borderBottomColor: colors.border, gap: 12 },
  pressed: { opacity: 0.88 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  icon: { color: colors.primary },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.primary },
  meta: { fontSize: type.caption, color: colors.slate500 },
  status: { marginTop: 4 },
  right: { alignItems: "flex-end", maxWidth: "45%", gap: 2 },
  amount: { fontSize: type.body, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, textAlign: "right" },
  ref: { fontSize: type.caption, color: colors.slate500 },
});
