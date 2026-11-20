import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

/** Opaque money content on a solid themed surface. */
export function WalletSurface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.walletSurface, borderRadius: 24, overflow: "hidden", padding: 20 }, style]}>
    <View style={{ gap: 16 }}>{children}</View>
  </View>;
}
