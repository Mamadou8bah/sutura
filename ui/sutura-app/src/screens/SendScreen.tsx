import { useHardwareBack } from "../hooks/useBackNavigation";
import { ReviewCard, ReviewLayout, ReviewRow, SecondaryButton } from "../components/Review";
import { SUTURA_FEE } from "../utils/fees";
import { formatMoney } from "../utils/format";
import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import {
  AmountHero,
  FormError,
  FormField,
  FormInput,
  OperationScreen,
  SubmitButton,
  WalletPicker,
} from "../components/OperationForm";
import { formatFraudError } from "../utils/fraudErrors";
import { useWallet } from "../context/WalletContext";

export function SendScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    data,
    sendMoney,
    selectedWalletId,
    setSelectedWalletId,
    selectedWallet,
    balanceHidden,
  } = useWallet();
  const [destination, setDestination] = useState("");
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
  const submit = async () => {
    if (submitting.current) return;
    if (!isValidAmount(amount.trim())) {
      setError("Enter an amount from 0.01 to 1,000,000,000,000, with at most four decimal places.");
      return;
    }
    if (!normalizePhone(destination)) { setError("Enter a valid recipient phone number, including its country code."); return; }
    Keyboard.dismiss();
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await sendMoney(destination.trim(), Number(amount), selectedWalletId);
      if (!result.ok) setError(formatFraudError(result.error ?? "Transfer failed"));
    } finally { submitting.current = false; setBusy(false); }
  };

  const review = () => {
    if (!isValidAmount(amount.trim())) { setError("Enter a valid amount with at most four decimal places."); return; }
    if (!normalizePhone(destination)) { setError("Enter a valid recipient phone number, including its country code."); return; }
    if (Number(amount) + SUTURA_FEE > selectedWallet.balance) { setError(`Insufficient balance. Available: ${formatMoney(selectedWallet.balance, selectedWallet.currency)}.`); return; }
    Keyboard.dismiss(); setError(null); setReviewing(true);
  };
  if (reviewing) return <ReviewLayout title="Review transfer" subtitle="Check the recipient and amount before sending."
    footer={<>
      <FormError message={error} />
      <SubmitButton label={`Send ${formatMoney(Number(amount), selectedWallet.currency, 4)}`} loading={busy} disabled={busy} onPress={submit} />
      <SecondaryButton label="Edit transfer" disabled={busy} onPress={() => { setReviewing(false); setError(null); }} />
    </>}>
    <ReviewCard>
      <ReviewRow label="You send" value={formatMoney(Number(amount), selectedWallet.currency, 4)} emphasis money />
      <ReviewRow label="Sutura fee" value={formatMoney(SUTURA_FEE, selectedWallet.currency)} money />
      <ReviewRow label="Recipient gets" value={formatMoney(Number(amount) - SUTURA_FEE, selectedWallet.currency, 4)} money />
      <ReviewRow label="To phone number" value={normalizePhone(destination) ?? destination} />
      <ReviewRow label="From wallet" value={`${selectedWallet.name} · ${selectedWallet.currency}`} last />
    </ReviewCard>
    <Text style={styles.note}>Sutura sends to the {selectedWallet.currency} wallet registered to this number. Transfers can't be cancelled once sent.</Text>
  </ReviewLayout>;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OperationScreen title="Send money" subtitle="Send to a Sutura account">


        <FormField label="Recipient phone number">
          <FormInput
            placeholder="e.g. +220 700 0002"
            value={destination}
            onChangeText={(v) => {
              if (isPhoneDraft(v)) setDestination(v);
              setError(null);
            }}
            inputMode="tel"
            keyboardType="phone-pad"
            accessibilityLabel="Recipient phone number"
            autoComplete="tel"
            maxLength={40}
          />
        </FormField>

        <WalletPicker
          wallets={data.wallets}
          selectedId={selectedWalletId}
          onSelect={setSelectedWalletId}
          hidden={balanceHidden}
        />

        <AmountHero amount={amount} onChange={setAmount} currency={selectedWallet.currency} />



        <FormError message={error} />
        <SubmitButton loading={busy} disabled={!amount.trim() || !destination.trim() || !selectedWallet.id} label="Review transfer" onPress={review} />
      </OperationScreen>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  note: { fontSize: 13, lineHeight: 19, color: colors.slate500 },
});
