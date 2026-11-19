import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";
import { brand } from "../constants/brand";
import { colors, fonts, radii, shadow } from "../theme";
import { formatMoney, formatTimestamp } from "../utils/format";
import { shareTransactionReceiptPdf } from "../utils/receiptPdf";
import { isCreditTransaction, transactionTypeLabel } from "../utils/transactionDetails";
import { StatusPill, statusLabel } from "./StatusPill";
import { Money } from "./Money";

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export function TransactionDetailSheet() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { selectedTransaction, closeTransaction, data } = useWallet();
  const txn = selectedTransaction;
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  async function shareReceipt() {
    if (!txn || sharing) return;
    setShareError(null);
    setSharing(true);
    try {
      await shareTransactionReceiptPdf(txn, {
        name: data.session.name,
        phone: data.session.phone,
      });
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("cancel"))) return;
      setShareError("Could not share receipt. Try again.");
    } finally {
      setSharing(false);
    }
  }

  if (!txn) return null;

  const credit = isCreditTransaction(txn);
  const sign = credit ? "+" : "−";

  return (
    <Modal visible animationType="slide" onRequestClose={closeTransaction}>
      <SafeAreaProvider><SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeTransaction} style={styles.iconBtn}>
            <Ionicons name="close" size={22} color={colors.slate700} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.topTitle}>Transaction details</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Share receipt" accessibilityState={{ busy: sharing }} onPress={shareReceipt} style={styles.iconBtn} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, shadow.card]}>
            <Text style={styles.heroType}>{transactionTypeLabel(txn.type)}</Text>
            <Money amount={txn.amount} currency={txn.currency} sign={sign} style={styles.heroAmount} />
            <Text style={styles.heroCounterparty}>{txn.counterparty}</Text>
            <View style={styles.statusBadge}><StatusPill status={txn.status} /></View>
          </View>

          <View style={[styles.detailsCard, shadow.card]}>
            <DetailRow label="Reference" value={txn.id} />
            <DetailRow label="Date & time" value={formatTimestamp(txn.time)} />
            <DetailRow label="Method" value={txn.method} />
            {txn.category ? <DetailRow label="Type" value={statusLabel(txn.category)} /> : null}
            <DetailRow label="Direction" value={credit ? "Money in" : "Money out"} last />
          </View>

          <Pressable
            accessibilityRole="button" accessibilityLabel="Share PDF receipt" accessibilityState={{ busy: sharing, disabled: sharing }}
            onPress={shareReceipt}
            disabled={sharing}
            style={({ pressed }) => [styles.shareBtn, (pressed || sharing) && styles.shareBtnPressed]}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#181a20" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color="#181a20" />
                <Text style={styles.shareBtnText}>Share PDF receipt</Text>
              </>
            )}
          </Pressable>
          {shareError ? <Text accessibilityRole="alert" style={styles.shareError}>{shareError}</Text> : null}
        </ScrollView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  topTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.slate900 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroType: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.slate500,
  },
  heroAmount: { fontSize: 36, lineHeight: 44, textAlign: "center", fontFamily: fonts.semibold, fontWeight: "600", color: colors.slate900, marginTop: 8 },
  heroCounterparty: { fontSize: 16, fontFamily: fonts.medium, color: colors.slate700, marginTop: 6 },
  statusBadge: { marginTop: 14 },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, flex: 1 },
  detailValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.slate900, flex: 1.2, textAlign: "right" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: brand.orange,
    marginTop: 4,
  },
  shareBtnPressed: { opacity: 0.92 },
  shareBtnText: { fontSize: 16, fontFamily: fonts.bold, color: "#181a20" },
  shareError: { fontSize: 13, fontFamily: fonts.medium, color: colors.rose800, textAlign: "center" },
});
