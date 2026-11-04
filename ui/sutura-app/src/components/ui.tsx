import { NativeButton } from "./NativeControls";
import { useState } from "react";
import { isAmountDraft } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputProps, type ViewStyle } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "./NativeControls";
import { colors, radii, shadow } from "../theme";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function AppInput(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [focused, setFocused] = useState(false);
  return <TextInput {...props} placeholderTextColor={props.placeholderTextColor ?? colors.slate500} selectionColor={colors.orange} onFocus={event => {setFocused(true); props.onFocus?.(event);}} onBlur={event => {setFocused(false);props.onBlur?.(event);}} style={[styles.input, Platform.OS === "web" && {outlineColor:colors.orange}, focused && {borderColor:colors.orange}, props.style]} />;
}

export function PrimaryButton({ label, onPress, disabled = false, color, style }: {
  label: string; onPress: () => void; disabled?: boolean; color?: string; textColor?: string; style?: ViewStyle;
}) {
  return <NativeButton label={label} onPress={onPress} disabled={disabled} color={color} style={style} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

export function AmountDisplay({ amount, onChange }: { amount: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.amountWrap}>
      <Text style={styles.amountCurrency}>GMD</Text>
      <TextInput
        value={amount}
        onChangeText={(value) => { if (isAmountDraft(value)) onChange(value); }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.slate300}
        style={styles.amountInput}
      />
    </View>
  );
}

export function MethodRow({
  label,
  subtitle,
  onPress,
  icon,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  icon?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable onPress={onPress} style={styles.methodRow}>
      <View style={styles.methodIcon}>
        <Text style={styles.methodIconText}>{icon ?? "›"}</Text>
      </View>
      <View style={styles.methodBody}>
        <Text style={styles.methodLabel}>{label}</Text>
        {subtitle ? <Text style={styles.methodSub}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.methodChevron}>›</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  input: {
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
    color: colors.slate900,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountWrap: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    marginVertical: 16,
  },
  amountCurrency: { fontSize: 14, fontWeight: "600", color: colors.slate500 },
  amountInput: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.slate900,
    marginTop: 4,
    minWidth: 120,
    textAlign: "center",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.blue100,
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  methodBody: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: "600", color: colors.slate900 },
  methodSub: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  methodChevron: { fontSize: 22, color: colors.slate400 },
});

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", padding: 24, paddingBottom: 40, gap: 16 }}>{children}</ScrollView></KeyboardAvoidingView>;
}
