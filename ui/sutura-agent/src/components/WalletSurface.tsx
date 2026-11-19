import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Opaque money content. Glass is reserved for navigation and transient controls. */
export function WalletSurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.walletSurface, borderRadius: 24, overflow: "hidden", padding: 20 }, style]}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, right: -35, top: -55, borderWidth: 24, borderColor: "rgba(255,255,255,0.12)" }} />
    <View style={{ gap: 16 }}>{children}</View>
  </View>;
}
