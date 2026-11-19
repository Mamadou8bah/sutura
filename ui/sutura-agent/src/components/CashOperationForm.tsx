import { isAmountDraft, isCurrencyDraft, isPhoneDraft, isValidAmount } from "../utils/inputValidation";
import { useThemedStyles } from "../context/ThemeContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { BackHeader } from "./AppHeader";
import { AppInput, Field, FormError, PrimaryButton } from "./ui";
import { HoldToConfirm } from "./HoldToConfirm";
import { ReviewCard, ReviewLayout, ReviewRow, SecondaryButton } from "./Review";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useAgent } from "../context/AgentContext";
import { spacing, type ThemeColors } from "../theme";
import { formatMoney } from "../utils/format";

type Kind = "DEPOSIT" | "WITHDRAWAL";

/**
 * New cash-in / cash-out at the counter: details, then a review with the customer's
 * registered name, amount and currency, then one press-and-hold primary to create
 * the operation. The idempotency key is tied to the submitted values and reused
 * when the agent tries the same values again; failed writes are never replayed.
 */
export function CashOperationForm({ kind }: { kind: Kind }) {
  const styles = useThemedStyles(createStyles);
  const { createOnBehalf, findCustomer, setTab, completed, pending, depositTarget } = useAgent();
  const deposit = kind === "DEPOSIT";
  const target = deposit ? depositTarget : null;
  const noun = deposit ? "cash-in" : "cash-out";
  // Currency comes from the agent's most recent operation; there is no agent wallet
  // or currency endpoint, so the agent can change it (three-letter ISO code).
  const lastCurrency = useMemo(() => [...pending, ...completed]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.currency ?? "", [pending, completed]);
  const [customer, setCustomer] = useState(target?.phone ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(target?.currency ?? lastCurrency);
  const seeded = useRef(Boolean(lastCurrency));
  useEffect(() => { if (!seeded.current && lastCurrency) { seeded.current = true; setCurrency(c => c || lastCurrency); } }, [lastCurrency]);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ name: string; phone: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const submission = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    if (target) { setCustomer(target.phone); setCurrency(target.currency); setAmount(""); setReview(null); setError(null); submission.current = null; }
  }, [target]);
  useHardwareBack(() => {
    if (busy) return true;
    if (review) { setReview(null); return true; }
    return false;
  });

  async function startReview() {
    if (checking) return;
    const code = currency.trim().toUpperCase();
    if (!isValidAmount(amount.trim())) { setError("Enter an amount from 0.01 with at most four decimal places."); return; }
    if (!/^[A-Z]{3}$/.test(code)) { setError("Enter the three-letter currency of the customer's wallet, for example GMD."); return; }
    Keyboard.dismiss();
    setChecking(true); setError(null);
    const found = await findCustomer(customer);
    setChecking(false);
    if (!found.ok) { setError(found.error); return; }
    setCurrency(code);
    setReview({ name: found.name, phone: found.phone });
  }

  async function submit() {
    if (busy || !review) return;
    const fingerprint = JSON.stringify([review.phone, amount.trim(), currency, target?.walletId ?? null]);
    if (submission.current?.fingerprint !== fingerprint) {
      submission.current = { fingerprint, key: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
    }
    setBusy(true);
    setError(null);
    const result = await createOnBehalf(kind, review.phone, amount.trim(), currency, submission.current.key, target?.walletId);
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  if (review) {
    const total = formatMoney(Number(amount), currency, 4);
    return <ReviewLayout title={`Review ${noun}`}
      subtitle={deposit ? "Check the customer and amount. Take cash only after the operation shows Completed." : "Check the customer's ID and amount. Hand over cash only after the operation shows Completed."}
      footer={<>
        <FormError message={error} />
        <HoldToConfirm label={`Create ${noun} · ${total}`} loading={busy} loadingLabel="Creating…" onConfirm={submit} />
        <SecondaryButton label="Edit" disabled={busy} onPress={() => { setReview(null); setError(null); }} />
      </>}>
      <ReviewCard>
        <ReviewRow label="Customer" value={review.name || "Registered customer"} />
        <ReviewRow label="Phone" value={review.phone} />
        {target && <ReviewRow label="Deposit wallet" value={`${target.walletName} · ${target.currency}`} />}
        <ReviewRow label="Operation" value={deposit ? "Cash-in (deposit)" : "Cash-out (withdrawal)"} />
        <ReviewRow label="Fee" value="Confirmed on receipt" />
        <ReviewRow label={deposit ? "Customer receives" : "Cash to hand over"} value={total} emphasis money last />
      </ReviewCard>
    </ReviewLayout>;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackHeader title={`New ${noun}`} onBack={() => setTab("home")} />
        {target && <Field label="Scanned deposit wallet">
          <Text style={{ fontSize: 17, fontWeight: "600" }}>{target.name}</Text>
          <Text style={{ fontSize: 15 }}>{target.walletName} · {target.currency}</Text>
        </Field>}
        <Field label="Registered customer phone">
          <AppInput accessibilityLabel="Registered customer phone" inputMode="tel" maxLength={40} value={customer}
            onChangeText={value => { if (isPhoneDraft(value)) { setCustomer(value); setError(null); } }}
            placeholder="+220 700 0000" keyboardType="phone-pad" autoComplete="tel" editable={!checking && !target} />
        </Field>
        <Field label="Currency" hint="The currency of the customer's wallet.">
          <AppInput accessibilityLabel="Currency" autoCapitalize="characters" autoCorrect={false} maxLength={3} value={currency}
            onChangeText={value => { if (isCurrencyDraft(value)) { setCurrency(value.toUpperCase()); setError(null); } }}
            placeholder="GMD" editable={!checking && !target} />
        </Field>
        <Field label={currency ? `Amount (${currency})` : "Amount"} hint={deposit ? "Take cash only after the operation shows Completed." : "Hand over cash only after verification and completion."}>
          <AppInput accessibilityLabel="Amount" inputMode="decimal" maxLength={18} value={amount}
            onChangeText={value => { if (isAmountDraft(value)) { setAmount(value); setError(null); } }}
            keyboardType="decimal-pad" placeholder="0.00" editable={!checking} style={styles.amount} />
        </Field>
        <FormError message={error} />
        <PrimaryButton loading={checking} label={checking ? "Finding customer…" : `Review ${noun}`} onPress={startReview}
          disabled={checking || !customer.trim() || !amount.trim() || currency.trim().length !== 3} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.screen, paddingBottom: 32, gap: 16 },
  amount: { fontSize: 22, fontVariant: ["tabular-nums"] },
});
