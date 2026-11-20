import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Opaque, warm summary surface for balances and daily totals. */
export function WalletSurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.walletSurface, borderRadius: 24, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", padding: 20 }, style]}>
    <LinearGradient colors={[colors.walletHighlight, colors.walletSurface]}
      pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} />
    <View style={{ gap: 12 }}>{children}</View>
  </View>;
}
