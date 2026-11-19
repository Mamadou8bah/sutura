import { isValidAmount } from "../utils/inputValidation";
import { useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AgentQrCard } from "../components/AgentQrCard";
import { AmountHero, FormError, SubmitButton, WalletPicker } from "../components/OperationForm";
import { ReviewCard, ReviewLayout, ReviewRow, SecondaryButton } from "../components/Review";
import { formatFraudError } from "../utils/fraudErrors";
import { formatMoney } from "../utils/format";
import { SUTURA_FEE } from "../utils/fees";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing, type } from "../theme";

export function WithdrawScreen() {
  const styles = useThemedStyles(createStyles);
  const { data, withdraw, withdrawalQr, selectedWallet, selectedWalletId, setSelectedWalletId, setTab, balanceHidden } = useWallet();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useHardwareBack(() => {
    if (busy) return true;
    if (reviewing) { setReviewing(false); return true; }
    return false;
  });

  const currency = selectedWallet.currency;
  const value = Number(amount);

  const review = () => {
    if (!isValidAmount(amount.trim())) { setError("Enter an amount from 0.01 to 1,000,000,000,000, with at most four decimal places."); return; }
    if (value + SUTURA_FEE > selectedWallet.balance) { setError(`Insufficient balance. Available: ${formatMoney(selectedWallet.balance, currency)}.`); return; }
    Keyboard.dismiss(); setError(null); setReviewing(true);
  };

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await withdraw(value, selectedWalletId);
      if (!result.ok) setError(formatFraudError(result.error ?? "Withdrawal failed"));
      else setReviewing(false);
    } finally { submitting.current = false; setBusy(false); }
  };

  if (reviewing) return <ReviewLayout title="Review withdrawal" subtitle="Check the details before you create the withdrawal."
    footer={<>
      <FormError message={error} />
      <SubmitButton label="Create withdrawal QR" loading={busy} disabled={busy} onPress={() => void submit()} />
      <SecondaryButton label="Edit withdrawal" disabled={busy} onPress={() => { setReviewing(false); setError(null); }} />
    </>}>
    <ReviewCard>
      <ReviewRow label="You withdraw" value={formatMoney(value, currency, 4)} emphasis money />
      <ReviewRow label="Sutura fee" value={formatMoney(SUTURA_FEE, currency)} money />
      <ReviewRow label="You receive in cash" value={formatMoney(value - SUTURA_FEE, currency, 4)} money />
      <ReviewRow label="From wallet" value={`${selectedWallet.name} · ${currency}`} />
      <ReviewRow label="Paid out by" value="Any Sutura agent" last />
    </ReviewCard>
    <Text style={styles.note}>You'll get a QR code to show the agent. Your balance changes when the agent completes the cash-out.</Text>
  </ReviewLayout>;

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <BackHeader title="Withdraw cash" onBack={() => setTab("home")} />
      <Text style={styles.subtitle}>Collect cash from any Sutura agent.</Text>
      <WalletPicker wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />
      <AmountHero amount={amount} onChange={next => { setAmount(next); setError(null); }} currency={currency} />
      <FormError message={error} />
      <SubmitButton disabled={!amount.trim() || !selectedWallet.id} label="Review withdrawal" onPress={review} />
      {withdrawalQr ? <AgentQrCard payload={withdrawalQr} title="Withdrawal QR code" hint="Show this to receive cash." /> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: spacing.screen, paddingBottom: spacing.section, gap: spacing.gap },
  subtitle: { fontSize: type.body, fontFamily: fonts.regular, color: colors.slate500 },
  note: { fontSize: type.caption, lineHeight: 19, color: colors.slate500 },
});
