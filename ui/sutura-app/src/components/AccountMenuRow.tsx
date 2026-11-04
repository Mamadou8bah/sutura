import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
export function AccountMenuRow({ label, icon, value, hint, onPress, trailing }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; value?: string;
  hint?: string; onPress?: () => void; trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const content = <><Ionicons name={icon} size={21} color={colors.primary} />
    <View style={styles.body}><Text style={styles.label}>{label}</Text>{hint && <Text style={styles.hint}>{hint}</Text>}</View>
    {value && <Text style={styles.value}>{value}</Text>}{trailing}
    {onPress && <Ionicons name="chevron-forward" size={17} color={colors.slate400} />}</>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  body: { flex: 1, minWidth: 0 }, label: { fontFamily: fonts.medium, fontSize: 15, color: colors.primary },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 3, color: colors.slate500 },
  value: { flexShrink: 1, maxWidth: "44%", textAlign: "right", fontFamily: fonts.regular, fontSize: 13, color: colors.slate500 },
  pressed: { backgroundColor: colors.surfaceMuted },
});
