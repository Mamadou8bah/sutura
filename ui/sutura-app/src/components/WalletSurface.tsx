import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Opaque summary surface for balances and daily totals. */
export function WalletSurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.walletSurface, borderRadius: 24, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", padding: 20 }, style]}>
    <View style={{ gap: 12 }}>{children}</View>
  </View>;
}
