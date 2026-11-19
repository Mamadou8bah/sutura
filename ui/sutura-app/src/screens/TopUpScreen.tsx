import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AgentQrCard } from "../components/AgentQrCard";
import { AmountHero, FormError, FormField, FormInput, MethodTabs, SubmitButton, WalletPicker } from "../components/OperationForm";
import { ReviewCard, ReviewLayout, ReviewRow, SecondaryButton } from "../components/Review";
import { formatFraudError } from "../utils/fraudErrors";
import { formatMoney } from "../utils/format";
import { SUTURA_FEE } from "../utils/fees";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing, type } from "../theme";

type Method = "mobile_money" | "agent";

export function TopUpScreen() {
  const styles = useThemedStyles(createStyles);
  const { data, topUp, depositQr, selectedWallet, selectedWalletId, setSelectedWalletId, setTab, balanceHidden } = useWallet();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(data.session.phone);
  const [method, setMethod] = useState<Method>("mobile_money");
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useHardwareBack(() => {
    if (busy) return true;
    if (reviewing) { setReviewing(false); return true; }
    return false;
  });

  const review = () => {
    if (!isValidAmount(amount.trim())) { setError("Enter an amount from 0.01 to 1,000,000,000,000, with at most four decimal places."); return; }
    if (method === "mobile_money" && !normalizePhone(phone)) { setError("Enter a valid mobile-money phone number."); return; }
    Keyboard.dismiss(); setError(null); setReviewing(true);
  };

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await topUp(Number(amount), method, normalizePhone(phone) ?? phone, selectedWalletId);
      if (!result.ok) setError(formatFraudError(result.error ?? "Top up failed"));
      else setReviewing(false);
    } finally { submitting.current = false; setBusy(false); }
  };

  const currency = selectedWallet.currency;
  const value = Number(amount);

  if (reviewing) return <ReviewLayout title="Review top up" subtitle="Check the details before you continue."
    footer={<>
      <FormError message={error} />
      <SubmitButton label={method === "mobile_money" ? "Continue to payment" : "Create deposit QR"} loading={busy} disabled={busy} onPress={() => void submit()} />
      <SecondaryButton label="Edit top up" disabled={busy} onPress={() => { setReviewing(false); setError(null); }} />
    </>}>
    <ReviewCard>
      <ReviewRow label="Amount" value={formatMoney(value, currency, 4)} emphasis money />
      <ReviewRow label="Sutura fee" value={formatMoney(SUTURA_FEE, currency)} money />
      <ReviewRow label="Added to wallet" value={formatMoney(value - SUTURA_FEE, currency, 4)} money />
      <ReviewRow label="Wallet" value={`${selectedWallet.name} · ${currency}`} />
      <ReviewRow label="Method" value={method === "mobile_money" ? `Mobile money · ${normalizePhone(phone) ?? phone}` : "Cash at a Sutura agent"} last />
    </ReviewCard>
    <Text style={styles.note}>{method === "mobile_money"
      ? "You'll finish the payment on your mobile-money provider's page. Your provider may charge its own fee."
      : "You'll get a QR code to show the agent. The money is added when the agent completes the cash-in."}</Text>
  </ReviewLayout>;

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <BackHeader title="Top up" onBack={() => setTab("home")} />
      <WalletPicker wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />
      <AmountHero amount={amount} onChange={value => { setAmount(value); setError(null); }} currency={currency} />
      <MethodTabs options={[{ id: "mobile_money" as const, label: "Mobile money" }, { id: "agent" as const, label: "Agent cash-in" }]} value={method} onChange={setMethod} />
      {method === "mobile_money" ? <FormField label="Phone number">
        <FormInput value={phone} onChangeText={value => { if (isPhoneDraft(value)) setPhone(value); }} accessibilityLabel="Mobile money phone number" inputMode="tel" autoComplete="tel" maxLength={40} keyboardType="phone-pad" />
      </FormField> : <Text style={styles.agentHint}>You'll get a QR code to show a Sutura agent when you hand over the cash.</Text>}
      <FormError message={error} />
      <SubmitButton disabled={!amount.trim() || !selectedWallet.id} label="Review top up" onPress={review} />
      {depositQr && method === "agent" ? <AgentQrCard payload={depositQr} title="Deposit QR code" hint="Show this to a Sutura agent." /> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: spacing.screen, paddingBottom: spacing.section, gap: spacing.gap },
  agentHint: { fontSize: type.body, fontFamily: fonts.regular, color: colors.slate500, lineHeight: 21 },
  note: { fontSize: type.caption, lineHeight: 19, color: colors.slate500 },
});
