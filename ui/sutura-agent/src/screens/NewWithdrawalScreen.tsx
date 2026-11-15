import {isAmountDraft,isPhoneDraft} from "../utils/inputValidation";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { BackHeader } from "../components/AppHeader";
import { AppInput, Field, FormError, PrimaryButton } from "../components/ui";
import { useAgent } from "../context/AgentContext";
import { brand } from "../constants/brand";
import { spacing } from "../theme";

export function NewWithdrawalScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { createOnBehalf, setTab } = useAgent();
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const submission = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submit() {
    if (busy) return;
    const fingerprint = JSON.stringify([customer.trim(), amount]);
    if (submission.current?.fingerprint !== fingerprint) {
      submission.current = { fingerprint, key: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
    }
    setBusy(true);
    setError(null);
    const result = await createOnBehalf("WITHDRAWAL", customer, amount.trim(), "GMD", submission.current.key);
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackHeader title="New cash-out" onBack={() => setTab("home")} />
        <Field label="Registered customer phone">
          <AppInput accessibilityLabel="Registered customer phone" inputMode="tel" maxLength={40} value={customer} onChangeText={value=>{if(isPhoneDraft(value))setCustomer(value);}} placeholder="+220..." keyboardType="phone-pad" editable={!busy} />
        </Field>
        <Field label="Amount (GMD)" hint="Cash to hand over after verification">
          <AppInput accessibilityLabel="Amount" inputMode="decimal" maxLength={18} value={amount} onChangeText={value=>{if(isAmountDraft(value))setAmount(value);}} keyboardType="decimal-pad" placeholder="0.00" editable={!busy} />
        </Field>
        <FormError message={error} />
        <PrimaryButton loading={busy} label="Create withdrawal" onPress={submit} disabled={busy} color={brand.orange} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, paddingBottom: 32, gap: 16 },
});
