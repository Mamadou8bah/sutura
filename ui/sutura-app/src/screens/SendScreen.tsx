import { SelectionSheet } from "../components/SelectionSheet";
import { SwipeToConfirm } from "../components/SwipeToConfirm";
import { ContactSuggestions } from "../components/ContactSuggestions";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { ReviewCard, ReviewRow } from "../components/Review";
import { SUTURA_FEE } from "../utils/fees";
import { formatMoney } from "../utils/format";
import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { BackHeader } from "../components/AppHeader";
import { useThemedStyles } from "../context/ThemeContext";
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
  const styles = useThemedStyles(createStyles);

  const {
    data,
    sendMoney,
    selectedWalletId,
    setSelectedWalletId,
    selectedWallet,
    balanceHidden,
    setTab,
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
  const confirmation = reviewing && <SelectionSheet visible title="Confirm Transfer" onClose={() => {
    if (!busy) { setReviewing(false); setError(null); }
  }}>
    <View style={{ gap: 12 }}>
      <ReviewCard>
        <ReviewRow label="You send" value={formatMoney(Number(amount), selectedWallet.currency, 4)} emphasis money />
        <ReviewRow label="Sutura fee" value={formatMoney(SUTURA_FEE, selectedWallet.currency)} money />
        <ReviewRow label="Recipient gets" value={formatMoney(Number(amount) - SUTURA_FEE, selectedWallet.currency, 4)} money />
        <ReviewRow label="To phone number" value={normalizePhone(destination) ?? destination} />
        <ReviewRow label="From wallet" value={`${selectedWallet.name} · ${selectedWallet.currency}`} last />
      </ReviewCard>
      <Text style={styles.note}>Sutura sends to the {selectedWallet.currency} wallet registered to this number. Transfers can't be cancelled once sent.</Text>
      <FormError message={error} />
      <SwipeToConfirm label="Swipe to Send" busy={busy} onConfirm={() => void submit()} />
    </View>
  </SelectionSheet>;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OperationScreen>
        <BackHeader title="Send Money" onBack={() => setTab("home")} />
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

        <ContactSuggestions value={destination} onSelect={phone => { setDestination(phone); setError(null); Keyboard.dismiss(); }} />

        <AmountHero amount={amount} onChange={setAmount} currency={selectedWallet.currency} />
        <WalletPicker compact wallets={data.wallets} selectedId={selectedWalletId}
          onSelect={setSelectedWalletId} hidden={balanceHidden} />

        <FormError message={error} />
        <SubmitButton loading={busy} disabled={!amount.trim() || !destination.trim() || !selectedWallet.id} label="Continue" onPress={review} />
      </OperationScreen>
      {confirmation}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  note: { fontSize: 13, lineHeight: 19, color: colors.slate500 },
});
