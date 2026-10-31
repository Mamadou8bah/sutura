import { useHardwareBack } from "../hooks/useBackNavigation";
import { PrimaryButton } from "../components/ui";
import { formatMoney } from "../utils/format";
import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, StyleSheet, Text, View } from "react-native";
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
    if (Number(amount) > selectedWallet.balance) { setError("Insufficient balance."); return; }
    Keyboard.dismiss(); setError(null); setReviewing(true);
  };
  if (reviewing) return <OperationScreen title="Review transfer" subtitle="Check the recipient and amount before sending.">
    <View style={styles.reviewCard}><Text style={styles.reviewLabel}>You send</Text><Text style={styles.reviewAmount}>{formatMoney(Number(amount), selectedWallet.currency, 4)}</Text></View>
    <View style={styles.reviewCard}><Text style={styles.reviewLabel}>Recipient phone number</Text><Text style={styles.reviewValue}>{normalizePhone(destination)}</Text><Text style={styles.reviewLabel}>From wallet</Text><Text style={styles.reviewValue}>{selectedWallet.name}</Text></View>
    <FormError message={error} />
    <SubmitButton label="Confirm transfer" loading={busy} disabled={busy} onPress={submit} />
    <PrimaryButton label="Edit transfer" color={colors.surfaceMuted} textColor={colors.primary} disabled={busy} onPress={() => {setReviewing(false);setError(null);}} />
  </OperationScreen>;

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
  reviewCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 20, gap: 12 },
  reviewLabel: { fontSize: 13, color: colors.slate500 },
  reviewAmount: { fontSize: 30, fontWeight: "700", color: colors.primary },
  reviewValue: { fontSize: 18, fontWeight: "600", color: colors.primary },
});
