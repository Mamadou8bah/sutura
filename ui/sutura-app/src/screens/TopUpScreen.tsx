import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Keyboard, Platform, ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AgentQrCard } from "../components/AgentQrCard";
import {
  AmountHero,
  FormError,
  FormField,
  FormInput,
  MethodTabs,
  SubmitButton,
  WalletPicker,
} from "../components/OperationForm";
import { formatFraudError } from "../utils/fraudErrors";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing } from "../theme";

export function TopUpScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    data,
    topUp,
    depositQr,
    selectedWallet,
    selectedWalletId,
    setSelectedWalletId,
    setTab,
    balanceHidden,
  } = useWallet();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(data.session.phone);
  const [method, setMethod] = useState<"mobile_money" | "agent">("mobile_money");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return;
    if (!isValidAmount(amount.trim())) {
      setError("Enter an amount from 0.01 to 1,000,000,000,000, with at most four decimal places.");
      return;
    }
    if (method === "mobile_money" && !normalizePhone(phone)) { setError("Enter a valid mobile-money phone number."); return; }
    Keyboard.dismiss();
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await topUp(Number(amount), method, normalizePhone(phone) ?? phone, selectedWalletId);
      if (!result.ok) setError(formatFraudError(result.error ?? "Top up failed"));
    } finally { submitting.current = false; setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}><BackHeader title="Top up wallet" onBack={() => setTab("home")} /></View>
      <ScrollView
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >



        <WalletPicker
          wallets={data.wallets}
          selectedId={selectedWalletId}
          onSelect={setSelectedWalletId}
          hidden={balanceHidden}
        />

        <AmountHero amount={amount} onChange={setAmount} currency={selectedWallet.currency} />

        <MethodTabs
          options={[
            { id: "mobile_money" as const, label: "Mobile money" },
            { id: "agent" as const, label: "Agent cash-in" },
          ]}
          value={method}
          onChange={setMethod}
        />

        {method === "mobile_money" ? (
          <FormField label="Phone number">
            <FormInput value={phone} onChangeText={(value) => { if (isPhoneDraft(value)) setPhone(value); }} accessibilityLabel="Mobile money phone number" inputMode="tel" autoComplete="tel" maxLength={40} keyboardType="phone-pad" />
          </FormField>
        ) : (
          <Text style={styles.agentHint}>
            Generate a QR code and show it to a Sutura agent to deposit cash.
          </Text>
        )}

        <FormError message={error} />
        <SubmitButton loading={busy} disabled={!amount.trim() || !selectedWallet.id}
          label={method === "mobile_money" ? "Pay with mobile money" : "Generate deposit QR"}
          onPress={submit}
        />

        {depositQr && method === "agent" ? (
          <AgentQrCard payload={depositQr} title="Deposit QR code" hint="Show this to a Sutura agent." />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.screen, paddingTop: spacing.screen },
  wrap: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  agentHint: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, lineHeight: 20 },
});
