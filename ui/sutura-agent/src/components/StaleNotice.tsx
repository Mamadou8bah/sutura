import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { fonts, radii, type } from "../theme";

export function formatClock(date: Date | null | undefined) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * Slim strip shown when a refresh fails (identical copies in all three apps).
 * Says what is stale and since when, with Retry beside it. Reads only; it never
 * retries a payment.
 */
export function StaleNotice({ message, since, onRetry, busy = false }: {
  message: string; since?: Date | null; onRetry?: () => void; busy?: boolean;
}) {
  const { colors } = useTheme();
  const time = formatClock(since);
  const text = time ? `${message} Showing data from ${time}.` : message;
  return <View accessibilityRole="alert" style={[styles.strip, { backgroundColor: colors.warningBg }]}>
    <View style={[styles.dot, { backgroundColor: colors.warningFg }]} />
    <Text style={[styles.text, { color: colors.warningFg }]}>{text}</Text>
    {onRetry ? <Pressable accessibilityRole="button" accessibilityLabel="Retry refresh" accessibilityState={{ busy, disabled: busy }}
      disabled={busy} onPress={onRetry} style={styles.retry}>
      {busy ? <ActivityIndicator size="small" color={colors.warningFg} /> : <Text style={[styles.retryText, { color: colors.warningFg }]}>Retry</Text>}
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 12, borderRadius: radii.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { flex: 1, fontSize: type.caption, lineHeight: 18, paddingVertical: 10 },
  retry: { minWidth: 64, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  retryText: { fontSize: type.caption, fontFamily: fonts.semibold, fontWeight: "600", textDecorationLine: "underline" },
});
