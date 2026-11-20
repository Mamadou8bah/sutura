import { StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Opaque navigation and sheet surface in both themes. */
export function SurfaceBackdrop() {
  const { colors } = useTheme();
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 24 }]} />;
}
