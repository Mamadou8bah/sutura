import { Ionicons } from "@expo/vector-icons";
import { SelectionSheet } from "../components/SelectionSheet";
import { SwipeToConfirm } from "../components/SwipeToConfirm";
import { ContactSuggestions } from "../components/ContactSuggestions";
import { isValidAmount, isPhoneDraft, normalizePhone } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useRef, useState } from "react";
import { KeyboardScrollView as ScrollView } from "../components/KeyboardScrollView";
import { KeyboardAvoidingView, Keyboard, Platform, StyleSheet, View} from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { AgentQrCard } from "../components/AgentQrCard";
import { AmountHero, FormError, FormField, FormInput, SubmitButton, WalletPicker } from "../components/OperationForm";
import { ReviewCard, ReviewRow } from "../components/Review";
import { formatFraudError } from "../utils/fraudErrors";
import { formatMoney } from "../utils/format";
import { SUTURA_FEE } from "../utils/fees";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing, type } from "../theme";

type Method = "mobile_money" | "agent";

export function TopUpScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { data, topUp, depositQr, selectedWallet, selectedWalletId, setSelectedWalletId, setTab, balanceHidden } = useWallet();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(data.session.phone);
  const [method, setMethod] = useState<Method>("mobile_money");
  const [choosingMethod, setChoosingMethod] = useState(true);
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
    if (method === "mobile_money" && (selectedWallet.currency !== "GMD" || Number(amount) < 10 || (amount.split(".")[1]?.length ?? 0) > 2)) {
      setError("Online top-ups require a GMD wallet and at least GMD 10, with at most two decimal places."); return;
    }
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

  const confirmation = reviewing && <SelectionSheet visible title="Confirm Add Money" onClose={() => {
    if (!busy) { setReviewing(false); setError(null); }
  }}>
    <View style={{ gap: 12 }}>
      <ReviewCard>
        <ReviewRow label="Amount" value={formatMoney(value, currency, 4)} emphasis money />
        <ReviewRow label="Sutura fee" value={formatMoney(SUTURA_FEE, currency)} money />
        <ReviewRow label="Added to wallet" value={formatMoney(value - SUTURA_FEE, currency, 4)} money />
        <ReviewRow label="Wallet" value={`${selectedWallet.name} · ${currency}`} />
        <ReviewRow label="Method" value={method === "mobile_money" ? "Mobile money or card · ModemPay" : "Cash at a Sutura agent"} last />
      </ReviewCard>
      <Text style={styles.note}>{method === "mobile_money"
        ? "Complete your payment on ModemPay's secure checkout. Your provider may charge a fee. Your balance updates after confirmation."
        : "You'll get a QR code to show the agent. The money is added when the agent completes the cash-in."}</Text>
      <FormError message={error} />
      <SwipeToConfirm label="Swipe to Continue" busy={busy} onConfirm={() => void submit()} />
    </View>
  </SelectionSheet>;

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <BackHeader title="Add Money" onBack={() => setTab("home")} />
      <WalletPicker compact wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />
      <AmountHero flat amount={amount} onChange={value => { setAmount(value); setError(null); }} currency={currency} />
      <Pressable accessibilityRole="button" accessibilityLabel="Change payment method" onPress={() => setChoosingMethod(true)} style={styles.methodRow}>
        <Ionicons name={method === "mobile_money" ? "phone-portrait-outline" : "cash-outline"} size={21} color={colors.accentText} />
        <Text style={styles.methodLabel}>{method === "mobile_money" ? "Mobile money or card" : "Agent cash-in"}</Text>
        <Text style={styles.change}>Change</Text>
      </Pressable>
      {method === "mobile_money" ? <FormField label="Phone number">
        <FormInput value={phone} onChangeText={value => { if (isPhoneDraft(value)) setPhone(value); }} accessibilityLabel="Mobile money phone number" inputMode="tel" autoComplete="tel" maxLength={40} keyboardType="phone-pad" />
        <ContactSuggestions value={phone} onSelect={value => { setPhone(value); setError(null); Keyboard.dismiss(); }} />
      </FormField> : <Text style={styles.agentHint}>You'll get a QR code to show a Sutura agent when you hand over the cash.</Text>}
      <FormError message={error} />
      <SubmitButton disabled={!amount.trim() || !selectedWallet.id} label="Continue" onPress={review} />
      {depositQr && method === "agent" ? <AgentQrCard payload={depositQr} title="Deposit QR code" hint="Show this to a Sutura agent." /> : null}
    </ScrollView>
    <SelectionSheet visible={choosingMethod} title="Add Money" onClose={() => setChoosingMethod(false)}>
      <Text style={styles.note}>Choose how you want to fund your wallet.</Text>
      <View style={{ gap: 8, marginTop: 12 }}>
        {([{ id: "mobile_money", label: "Mobile money or card", icon: "phone-portrait-outline" },
          { id: "agent", label: "Agent cash-in", icon: "cash-outline" }] as const).map(option =>
          <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.label} onPress={() => {
            setMethod(option.id);
            setError(null);
            setChoosingMethod(false);
          }} style={styles.methodRow}>
            <Ionicons name={option.icon} size={21} color={colors.accentText} />
            <Text style={styles.methodLabel}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.slate500} />
          </Pressable>)}
      </View>
    </SelectionSheet>
    {confirmation}
  </KeyboardAvoidingView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: spacing.screen, paddingBottom: spacing.section, gap: spacing.gap },
  methodRow: { minHeight: 54, paddingHorizontal: 14, borderRadius: 16, flexDirection: "row",
    alignItems: "center", gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  methodLabel: { flex: 1, fontSize: type.body, color: colors.primary },
  change: { fontSize: type.caption, color: colors.accentText },
  agentHint: { fontSize: type.body, fontFamily: fonts.regular, color: colors.slate500, lineHeight: 21 },
  note: { fontSize: type.caption, lineHeight: 19, color: colors.slate500 },
});
