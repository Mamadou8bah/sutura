import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput, Field, PrimaryButton, Screen } from "../components/ui";
import { NativeText as Text, NativePressable as Pressable } from "../components/NativeControls";
import { useTheme } from "../context/ThemeContext";

export function VerificationCodeScreen({ value, onChange, onSubmit, onBack, busy, error }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void;
  onBack: () => void; busy: boolean; error: string;
}) {
  const { colors } = useTheme();
  const valid = /^[0-9]{6}$/.test(value);
  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" disabled={busy}
      onPress={onBack} style={{ width: 48, height: 48, justifyContent: "center" }}>
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </Pressable>
    <View style={{ gap: 12, marginBottom: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.orangeLight, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="shield-checkmark-outline" size={28} color={colors.orange} />
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "700", color: colors.primary }}>Enter verification code</Text>
      <Text style={{ color: colors.slate500, fontSize: 14, lineHeight: 21 }}>Enter the six-digit code sent to your phone or email. It expires in five minutes.</Text>
    </View>
    <Field label="Verification code"><AppInput accessibilityLabel="Verification code" autoFocus
      value={value} onChangeText={next => onChange(next.replace(/[^0-9]/g, "").slice(0, 6))}
      keyboardType="number-pad" inputMode="numeric" autoComplete="sms-otp" textContentType="oneTimeCode"
      autoCorrect={false} maxLength={6} editable={!busy} placeholder="000000"
      style={{ textAlign: "center", fontSize: 28, letterSpacing: 8, minHeight: 64 }}
      onSubmitEditing={() => { if (valid && !busy) onSubmit(); }} returnKeyType="done" /></Field>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800, lineHeight: 20 }}>{error}</Text>}
    <PrimaryButton label={busy ? "Verifying…" : "Verify and continue"} disabled={busy || !valid} onPress={onSubmit} />
    <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={{ minHeight: 48, justifyContent: "center" }}>
      <Text style={{ color: colors.orangeDark }}>Start sign-in again</Text>
    </Pressable>
  </Screen>;
}
