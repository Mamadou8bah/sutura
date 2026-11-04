import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useWallet } from "../context/WalletContext";
import { colors, fonts, radii } from "../theme";
import type { CustomerTransaction } from "../types";
import { formatMoney, formatTimestamp } from "../utils/format";

export function TransactionRow({
  txn,
  onPress,
}: {
  txn: CustomerTransaction;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { openTransaction, balanceHidden } = useWallet();
  const isCredit = txn.type === "TRANSFER_IN" || txn.type === "DEPOSIT";
  const sign = isCredit ? "+" : "−";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${txn.counterparty} transaction`}
      onPress={onPress ?? (() => openTransaction(txn.id))}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.icon}><Ionicons name={txn.type === "DEPOSIT" ? "add-outline" : txn.type === "WITHDRAWAL" ? "cash-outline" : isCredit ? "arrow-down-outline" : "arrow-up-outline"} size={21} color={colors.primary}/></View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {txn.counterparty}
        </Text>
        <Text style={styles.meta}>
          {txn.method} · {formatTimestamp(txn.time)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
          {balanceHidden ? "••••" : `${sign}${formatMoney(txn.amount, txn.currency)}`}
        </Text>
        <Text style={[styles.method, {color: txn.status === "FAILED" ? colors.rose800 : txn.status === "COMPLETED" ? colors.slate500 : colors.orangeDark}]}>{txn.status === "COMPLETED" ? "Completed" : txn.status === "FAILED" ? "Failed" : "Pending"}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center"},
  rowPressed: { opacity: 0.88 },
  body: { flex: 1, minWidth: 0, paddingRight: 0 },
  name: { fontSize: 14, fontFamily: fonts.medium, color: colors.slate900 },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  right: { alignItems: "flex-end", maxWidth: "45%" },
  amount: { fontSize: 13, fontFamily: fonts.bold, color: colors.slate900 },
  method: { fontSize: 11, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
});
