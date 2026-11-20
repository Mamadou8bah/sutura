import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeInput, NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { PrimaryButton, Screen } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { tabular } from "../theme";

const codeLength = 6;
const slots = Array.from({ length: codeLength }, (_, index) => index);

export function VerificationCodeInput({ value, onChange, onSubmit, busy, autoFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const activeSlot = Math.min(value.length, codeLength - 1);

  return <View style={styles.code}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" aria-hidden style={styles.slots}>
      {slots.map(index => <View key={index} style={[styles.slot, {
        backgroundColor: colors.surface,
        borderColor: focused && index === activeSlot ? colors.accentText : colors.border,
      }]}>
        <Text style={[styles.digit, tabular]}>{value[index] ?? ""}</Text>
        {focused && index === activeSlot && !value[index] && <View style={[styles.cursor, { backgroundColor: colors.accentText }]} />}
      </View>)}
    </View>
    <NativeInput accessibilityLabel="Verification code" autoFocus={autoFocus} value={value}
      onChangeText={text => onChange(text.replace(/[^0-9]/g, "").slice(0, codeLength))}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" textContentType="oneTimeCode"
      autoCorrect={false} autoCapitalize="none" caretHidden editable={!busy} style={styles.input}
      onSubmitEditing={() => { if (value.length === codeLength && !busy) onSubmit(); }} returnKeyType="done" />
  </View>;
}

export function VerificationCodeScreen({ value, onChange, onSubmit, onBack, busy, error }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void;
  onBack: () => void; busy: boolean; error: string;
}) {
  const { colors } = useTheme();
  return <View style={styles.screen}>
    <LinearGradient pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}
      colors={[colors.background, colors.walletHighlight, colors.walletSurface]} locations={[0, 0.52, 1]} />
    <Screen transparent>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" disabled={busy}
        onPress={onBack} style={[styles.back, { backgroundColor: colors.surface }]}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: colors.surface }]}>
            <Ionicons name="mail-outline" size={23} color={colors.accentText} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>Verify your account</Text>
          <Text style={[styles.description, { color: colors.slate500 }]}>
            Enter the six-digit code sent to your email. It expires in five minutes.
          </Text>
        </View>
        <VerificationCodeInput value={value} onChange={onChange} onSubmit={onSubmit} busy={busy} autoFocus />
        {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerFg }]}>{error}</Text>}
        <PrimaryButton loading={busy} label={busy ? "Verifying…" : "Verify and continue"}
          disabled={busy || !/^[0-9]{6}$/.test(value)} onPress={onSubmit} />
      </View>
    </Screen>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  content: { gap: 20, maxWidth: 420, width: "100%", alignSelf: "center" },
  intro: { alignItems: "center", gap: 10, paddingTop: 12 },
  icon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { textAlign: "center", fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  description: { textAlign: "center", fontSize: 14, lineHeight: 20, maxWidth: 290 },
  code: { position: "relative" },
  slots: { flexDirection: "row", gap: 6 },
  slot: { flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 10, alignItems: "center", justifyContent: "center",
    borderRadius: 10, borderWidth: 1 },
  digit: { fontSize: 22, fontWeight: "500", textAlign: "center" },
  cursor: { position: "absolute", width: 1, height: 20 },
  input: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", padding: 0, color: "transparent", backgroundColor: "transparent" },
  error: { fontSize: 14, lineHeight: 20 },
});
