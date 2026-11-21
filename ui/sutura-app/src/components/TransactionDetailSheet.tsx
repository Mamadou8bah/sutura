import { useState } from "react";
import { transferStatusMessage } from "../utils/transferActivity";
import { transactionStatusLabel } from "../utils/transactionDetails";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import type { CustomerTransaction } from "../types";
import { useWallet } from "../context/WalletContext";
import { formatTimestamp } from "../utils/format";
import { shareTransactionReceiptPdf } from "../utils/receiptPdf";
import { isCreditTransaction, transactionTypeLabel } from "../utils/transactionDetails";
import { NativeText as Text } from "./NativeControls";
import { SelectionSheet } from "./SelectionSheet";
import { StatusPill } from "./StatusPill";
import { Money } from "./Money";
import { PrimaryButton } from "./ui";

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text selectable style={styles.detailValue}>{value}</Text>
  </View>;
}

export function TransactionDetailSheet() {
  const { selectedTransaction, closeTransaction, data } = useWallet();
  if (!selectedTransaction) return null;
  return <TransactionReceipt key={selectedTransaction.id} txn={selectedTransaction} onClose={closeTransaction}
    owner={{ name: data.session.name, phone: data.session.phone }} />;
}

function TransactionReceipt({ txn, onClose, owner }: {
  txn: CustomerTransaction;
  onClose: () => void;
  owner: Parameters<typeof shareTransactionReceiptPdf>[1];
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const credit = isCreditTransaction(txn);

  async function shareReceipt() {
    if (sharing) return;
    setShareError(null);
    setSharing(true);
    try {
      await shareTransactionReceiptPdf(txn, owner);
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("cancel"))) return;
      setShareError("Could not share receipt. Try again.");
    } finally {
      setSharing(false);
    }
  }

  return <SelectionSheet visible title="Transaction details" onClose={onClose}>
    <View style={styles.content}>
      <View style={styles.summary}>
        <View style={styles.directionIcon}>
          <Ionicons name={credit ? "arrow-down-outline" : "arrow-up-outline"} size={22} color={colors.accentText} />
        </View>
        <Money amount={txn.amount} currency={txn.currency} sign={credit ? "+" : "−"} style={styles.amount} />
        <Text style={styles.counterparty}>{txn.counterparty}</Text>
        <View><StatusPill status={txn.status} label={transactionStatusLabel(txn.status)} tone={txn.status === "UNKNOWN" ? "warning" : undefined} /></View>
      </View>
      <View style={styles.details}>
        <DetailRow label="Date and time" value={formatTimestamp(txn.time)} />
        <DetailRow label="Transaction type" value={transactionTypeLabel(txn.type)} />
        <DetailRow label="Payment method" value={txn.method} />
        <DetailRow label="Reference" value={txn.reference ?? txn.id} />
      </View>
      {transferStatusMessage(txn) && <Text accessibilityLiveRegion="polite" style={styles.detailLabel}>{transferStatusMessage(txn)}</Text>}
      {shareError && <Text accessibilityRole="alert" style={styles.shareError}>{shareError}</Text>}
      {txn.status === "COMPLETED" && <PrimaryButton label={sharing ? "Preparing receipt…" : "Share PDF receipt"} loading={sharing}
        disabled={sharing} onPress={() => void shareReceipt()} />}
    </View>
  </SelectionSheet>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { gap: 16 },
  summary: { backgroundColor: colors.walletHighlight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 18,
    alignItems: "center", gap: 8 },
  directionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: colors.walletInk, textAlign: "center" },
  counterparty: { fontSize: 15, lineHeight: 21, color: colors.walletMuted, textAlign: "center" },
  details: { paddingHorizontal: 4, gap: 12 },
  detailRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", columnGap: 12, rowGap: 4 },
  detailLabel: { flexGrow: 1, flexBasis: 100, fontSize: 14, lineHeight: 20, color: colors.slate500 },
  detailValue: { flexGrow: 1, flexBasis: 130, minWidth: 0, fontSize: 14, lineHeight: 20,
    fontWeight: "500", color: colors.primary, textAlign: "right" },
  shareError: { fontSize: 14, lineHeight: 20, color: colors.dangerFg },
});
