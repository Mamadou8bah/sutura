import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { fonts, radii, spacing, tabular, type, type ThemeColors } from "../theme";

/**
 * Review layout used before any money moves (identical copies in all three apps):
 * a scrolling summary, then one sticky primary action with a neutral "Edit"
 * beside it. Only one orange control is ever on screen.
 */
export function ReviewLayout({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
    <View style={styles.footer}>{footer}</View>
  </KeyboardAvoidingView>;
}

/** Slip-style summary: label on the left, exact value on the right. */
export function ReviewCard({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.card}>{children}</View>;
}

export function ReviewRow({ label, value, emphasis = false, money = false, last = false }: {
  label: string; value: string; emphasis?: boolean; money?: boolean; last?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.row, !last && styles.rowBorder]} accessible accessibilityLabel={`${label}: ${value}`}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, emphasis && styles.emphasis, money && tabular]}>{value}</Text>
  </View>;
}

/** Neutral secondary action; never orange. */
export function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.secondary, { opacity: disabled ? 0.45 : 1 }]}>
    <Text style={[styles.secondaryText, { color: colors.primary }]}>{label}</Text>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.screen, paddingBottom: spacing.section, gap: spacing.gap },
  title: { fontSize: type.title, lineHeight: 34, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  subtitle: { fontSize: type.body, lineHeight: 21, color: colors.slate500 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { fontSize: type.body, color: colors.slate500, flexShrink: 1 },
  value: { fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500", color: colors.primary, textAlign: "right", flexShrink: 1 },
  emphasis: { fontSize: type.section, fontFamily: fonts.semibold, fontWeight: "600" },
  footer: { paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, paddingHorizontal: 16 },
  secondaryText: { fontSize: type.headline, fontFamily: fonts.medium, fontWeight: "500" },
});
