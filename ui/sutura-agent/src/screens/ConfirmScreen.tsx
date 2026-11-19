import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { useEffect, useRef, useState } from "react";
import { Share, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "../components/AppHeader";
import { Card, FormError, PrimaryButton } from "../components/ui";
import { useAgent } from "../context/AgentContext";
import { brand } from "../constants/brand";
import { HoldToConfirm } from "../components/HoldToConfirm";
import { Money } from "../components/Money";
import { StatusPill } from "../components/StatusPill";
import { fonts, radii, spacing, tabular, type } from "../theme";
import { formatMoney, formatTimestamp, operationLabel } from "../utils/format";

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
  const inFlight = useRef(false);

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
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const result = await completeActive();
    inFlight.current = false;
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
        <Money amount={op.amount} currency={op.currency} maxFractionDigits={4} style={styles.heroAmount} />
        <Text style={styles.heroCustomer}>{op.merchantName || op.walletName}</Text>
        <View style={styles.statusBadge}><StatusPill status={isCompleted ? "COMPLETED" : op.status} /></View>
      </View>

      <Card style={styles.details}>
        <DetailRow label="Customer" value={op.merchantName || "Registered customer"} />
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
          <HoldToConfirm label={`Complete ${operationLabel(op.operation).toLowerCase()} · ${formatMoney(op.amount, op.currency, 4)}`}
            loading={busy} loadingLabel="Completing…" disabled={busy||!["AWAITING_AGENT","PENDING","APPROVED"].includes(op.status)} onConfirm={handleComplete} />
          <PrimaryButton loading={historyLoading} label={historyLoading ? "Checking status…" : "Check operation status"} disabled={busy||historyLoading} onPress={()=>void refreshHistory()} color={colors.surfaceMuted}/>
        </>
      ) : (
        <>
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={48} color={colors.successFg} />
            <Text style={styles.successTitle}>Operation completed</Text>
            <Text style={styles.successSub}>Wallet updated and receipt recorded.</Text>
          </View>
          <PrimaryButton label="Share receipt" onPress={()=>{Share.share({message:`Sutura ${operationLabel(op.operation)}\n${op.reference}\n${formatMoney(op.amount,op.currency)}\nCompleted: ${formatTimestamp(op.completedAt??op.createdAt)}`}).catch(()=>setError("Could not share receipt."));}} color={colors.surfaceMuted}/>
          <FormError message={error}/>
          <PrimaryButton label="Back to home" onPress={handleClose} color={colors.orange} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.screen, gap: 16 },
  emptyText: { fontSize: type.headline, fontFamily: fonts.medium, color: colors.slate500 },
  hero: {
    borderRadius: radii.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroDeposit: { backgroundColor: colors.surfaceMuted },
  heroWithdraw: { backgroundColor: colors.surfaceMuted },
  heroType: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.slate500 },
  heroAmount: { fontSize: type.display, lineHeight: 44, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, marginTop: 8, textAlign: "center", ...tabular },
  heroCustomer: { fontSize: type.headline, fontFamily: fonts.medium, color: colors.slate700, marginTop: 6, textAlign: "center" },
  statusBadge: { marginTop: 14, alignItems: "center" },
  details: { gap: 0, padding: 0, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: type.body, fontFamily: fonts.regular, color: colors.slate500, flex: 1 },
  detailValue: {
    fontSize: type.body,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: colors.primary,
    flex: 1.2,
    textAlign: "right",
  },
  note: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    borderRadius: radii.md,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: type.body, fontFamily: fonts.regular, color: colors.slate700, lineHeight: 21 },
  success: { alignItems: "center", gap: 8, paddingVertical: 16 },
  successTitle: { fontSize: type.section, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  successSub: { fontSize: type.body, fontFamily: fonts.regular, color: colors.slate500 },
});
