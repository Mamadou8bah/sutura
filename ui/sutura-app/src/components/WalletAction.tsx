import { View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable, NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";

export function WalletAction({ label, icon, onPress, disabled = false }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return <NativePressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={{ flex: 1, flexBasis: fontScale > 1.3 ? 104 : 0, minWidth: 52, minHeight: 80, alignItems: "center", gap: 7, opacity: disabled ? .45 : 1 }}>
    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={22} color={colors.accentText} />
    </View>
    <Text style={{ fontSize: 12, color: colors.primary, textAlign: "center", alignSelf: "stretch" }}>{label}</Text>
  </NativePressable>;
}
