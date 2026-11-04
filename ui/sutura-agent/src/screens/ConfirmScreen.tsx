import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { useEffect, useState } from "react";
import { Share, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "../components/AppHeader";
import { Card, FormError, PrimaryButton } from "../components/ui";
import { useAgent } from "../context/AgentContext";
import { brand } from "../constants/brand";
import { colors, fonts, radii, spacing } from "../theme";
import { formatMoney, formatTimestamp, operationLabel, statusLabel } from "../utils/format";

function DetailRow({ label, value }: { label: string; value: string }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ConfirmScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { activeOperation, completeActive, clearActive, setTab,refreshHistory,historyLoading } = useAgent();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDone(false);
    setError(null);
  }, [activeOperation?.reference]);

  if (!activeOperation) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No operation selected</Text>
        <PrimaryButton label="Go to scan" onPress={() => setTab("scan")} color={brand.orange} />
      </View>
    );
  }

  const op = activeOperation;
  const isCompleted = op.status === "COMPLETED" || done;
  const isDeposit = op.operation === "DEPOSIT";

  async function handleComplete() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await completeActive();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? null);
      return;
    }
    setDone(true);
  }

  function handleClose() {
    clearActive();
    setTab("home");
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackHeader title="Confirm operation" onBack={() => setTab("scan")} />

      <View style={[styles.hero, isDeposit ? styles.heroDeposit : styles.heroWithdraw]}>
        <Text style={styles.heroType}>{operationLabel(op.operation)}</Text>
        <Text style={styles.heroAmount}>{formatMoney(op.amount, op.currency)}</Text>
        <Text style={styles.heroCustomer}>{op.merchantName}</Text>
        <View style={[styles.statusBadge, isCompleted ? styles.statusDone : styles.statusPending]}>
          <Text style={[styles.statusText, isCompleted ? styles.statusDoneText : styles.statusPendingText]}>
            {statusLabel(isCompleted ? "COMPLETED" : op.status)}
          </Text>
        </View>
      </View>

      <Card style={styles.details}>
        <DetailRow label="Reference" value={op.reference} />
        <DetailRow label="Wallet" value={`${op.walletName} (#${op.walletId})`} />
        <DetailRow label="Date" value={formatTimestamp(op.createdAt)} />
        {op.location ? <DetailRow label="Location" value={op.location} /> : null}
        <DetailRow label="Action" value={isDeposit ? "Confirm cash-in settlement" : "Verify ID and confirm settlement"} />
      </Card>

      {!isCompleted ? (
        <>
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.noteText}>
              Verify the customer and amount before confirming. Exchange cash only after this
              operation shows Completed. If it enters review, wait for approval.
            </Text>
          </View>
          <FormError message={error} />
          <PrimaryButton label={historyLoading ? "Checking status…" : "Check operation status"} disabled={busy||historyLoading} onPress={()=>void refreshHistory()} color={colors.surfaceMuted}/>
          <PrimaryButton label={busy ? "Confirming..." : "Complete operation"} disabled={busy||!["AWAITING_AGENT","PENDING","APPROVED"].includes(op.status)} onPress={handleComplete} color={brand.orange} />
        </>
      ) : (
        <>
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={48} color={colors.emerald700} />
            <Text style={styles.successTitle}>Operation completed</Text>
            <Text style={styles.successSub}>Wallet updated and receipt recorded.</Text>
          </View>
          <PrimaryButton label="Share receipt" onPress={()=>{Share.share({message:`Sutura ${operationLabel(op.operation)}\n${op.reference}\n${formatMoney(op.amount,op.currency)}\nCompleted: ${formatTimestamp(op.completedAt??op.createdAt)}`}).catch(()=>setError("Could not share receipt."));}} color={colors.surfaceMuted}/>
          <FormError message={error}/>
          <PrimaryButton label="Back to home" onPress={handleClose} color={colors.primary} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.screen, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: fonts.medium, color: colors.slate500 },
  hero: {
    borderRadius: radii.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroDeposit: { backgroundColor: colors.surfaceMuted },
  heroWithdraw: { backgroundColor: colors.surfaceMuted },
  heroType: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.slate700,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroAmount: { fontSize: 32, fontFamily: fonts.bold, color: colors.slate900, marginTop: 8 },
  heroCustomer: { fontSize: 16, fontFamily: fonts.medium, color: colors.slate700, marginTop: 6 },
  statusBadge: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill },
  statusPending: { backgroundColor: colors.amber100 },
  statusDone: { backgroundColor: colors.emerald100 },
  statusText: { fontSize: 12, fontFamily: fonts.bold },
  statusPendingText: { color: colors.amber700 },
  statusDoneText: { color: colors.emerald700 },
  details: { gap: 0, padding: 0, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, flex: 1 },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.slate900,
    flex: 1.2,
    textAlign: "right",
  },
  note: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.blue100,
    padding: 14,
    borderRadius: radii.md,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.slate700, lineHeight: 20 },
  success: { alignItems: "center", gap: 8, paddingVertical: 16 },
  successTitle: { fontSize: 20, fontFamily: fonts.bold, color: colors.slate900 },
  successSub: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500 },
});
