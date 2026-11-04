import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AgentQrCard } from "../components/AgentQrCard";
import {
  AmountHero,
  FormError,
  SubmitButton,
  WalletPicker,
} from "../components/OperationForm";
import { formatFraudError } from "../utils/fraudErrors";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing } from "../theme";

export function WithdrawScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    data,
    withdraw,
    withdrawalQr,
    selectedWallet,
    selectedWalletId,
    setSelectedWalletId,
    setTab,
    balanceHidden,
  } = useWallet();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return;
    if (!isValidAmount(amount.trim())) {
      setError("Enter an amount from 0.01 to 1,000,000,000,000, with at most four decimal places.");
      return;
    }
    Keyboard.dismiss();
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await withdraw(Number(amount), selectedWalletId);
      if (!result.ok) setError(formatFraudError(result.error ?? "Withdrawal failed"));
    } finally { submitting.current = false; setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackHeader title="Withdraw cash" onBack={() => setTab("home")} />

        <Text style={styles.subtitle}>Collect cash from any Sutura agent near you.</Text>


        <WalletPicker
          wallets={data.wallets}
          selectedId={selectedWalletId}
          onSelect={setSelectedWalletId}
          hidden={balanceHidden}
        />

        <AmountHero amount={amount} onChange={setAmount} currency={selectedWallet.currency} />

        <FormError message={error} />
        <SubmitButton loading={busy} disabled={!amount.trim() || !selectedWallet.id} label="Request withdrawal" onPress={submit} />

        {withdrawalQr ? (
          <AgentQrCard payload={withdrawalQr} title="Withdrawal QR code" hint="Show this to receive cash." />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, marginTop: -8 },
});
