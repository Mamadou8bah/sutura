import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export type ActionIconName = "send" | "cash-in" | "cash-out" | "wallet" | "qr" | "scan" | "support";

// Categorical illustrations, not payment statuses. The parent supplies the label.
const glyphs = {
  scan: "scan-outline",
  support: "headset-outline",
  send: "paper-plane-outline",
  "cash-in": "add-outline",
  "cash-out": "remove-outline",
  wallet: "wallet-outline",
  qr: "qr-code-outline",
} as const;

/** A consistent outline icon for service shortcuts. */
export function ActionIcon({ name, size = 56 }: { name: ActionIconName; size?: number }) {
  const { colors } = useTheme();
  const glyph = glyphs[name];
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    pointerEvents="none" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center" }}>
    <Ionicons name={glyph} size={Math.round(size * .5)} color={colors.accentText} accessible={false} />
  </View>;
}
