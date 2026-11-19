import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useWallet } from "../context/WalletContext";
import { fonts, type, type ThemeColors } from "../theme";
import type { CustomerTransaction } from "../types";
import { formatMoney, formatTimestamp } from "../utils/format";
import { Money } from "./Money";
import { StatusPill, statusLabel } from "./StatusPill";
import { transactionTypeLabel } from "../utils/transactionDetails";

export function TransactionRow({ txn, onPress }: { txn: CustomerTransaction; onPress?: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { openTransaction, balanceHidden } = useWallet();
  const isCredit = txn.type === "TRANSFER_IN" || txn.type === "DEPOSIT";
  const sign = isCredit ? "+" : "−";
  const amountText = balanceHidden ? "amount hidden" : `${isCredit ? "plus" : "minus"} ${formatMoney(txn.amount, txn.currency)}`;

  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${transactionTypeLabel(txn.type)}, ${txn.counterparty}, ${amountText}, ${statusLabel(txn.status)}, ${formatTimestamp(txn.time)}`}
    accessibilityHint="Opens transaction details"
    onPress={onPress ?? (() => openTransaction(txn.id))} style={styles.row}>
    <View style={styles.icon}><Ionicons name={txn.type === "DEPOSIT" ? "add-outline" : txn.type === "WITHDRAWAL" ? "cash-outline" : isCredit ? "arrow-down-outline" : "arrow-up-outline"} size={20} color={colors.primary} /></View>
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={2}>{txn.counterparty}</Text>
      <Text style={styles.meta}>{formatTimestamp(txn.time)}</Text>
    </View>
    <View style={styles.right}>
      {balanceHidden ? <Text style={styles.amount}>••••</Text>
        : <Money amount={txn.amount} currency={txn.currency} sign={sign} style={[styles.amount, isCredit && { color: colors.successFg }]} />}
      {txn.status !== "COMPLETED" ? <StatusPill status={txn.status} plain /> : null}
    </View>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12, minHeight: 64, borderBottomWidth: 0, borderBottomColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: type.body, lineHeight: 20, fontFamily: fonts.medium, fontWeight: "500", color: colors.primary },
  meta: { fontSize: type.caption, lineHeight: 18, color: colors.slate500, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 2, maxWidth: "50%" },
  amount: { fontSize: type.body, lineHeight: 20, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, textAlign: "right" },
});
