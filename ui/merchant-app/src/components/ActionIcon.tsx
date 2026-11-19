import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export type ActionIconName = "send" | "cash-in" | "cash-out" | "wallet" | "qr" | "scan" | "support";

// Categorical illustrations, not payment statuses. The parent supplies the label.
const icons = {
  scan: { glyph: "scan-outline", light: ["#e4effc", "#265e9c"], dark: ["#1c3046", "#a4ceff"] },
  support: { glyph: "headset-outline", light: ["#dff4ed", "#14705a"], dark: ["#15382e", "#85dec0"] },
  send: { glyph: "paper-plane-outline", light: ["#fff0e5", "#c2410c"], dark: ["#402918", "#ffb779"] },
  "cash-in": { glyph: "add-outline", light: ["#ffedd5", "#b94b0b"], dark: ["#402918", "#ffb779"] },
  "cash-out": { glyph: "remove-outline", light: ["#dff4ed", "#14705a"], dark: ["#15382e", "#85dec0"] },
  wallet: { glyph: "wallet-outline", light: ["#e4effc", "#265e9c"], dark: ["#1c3046", "#a4ceff"] },
  qr: { glyph: "qr-code-outline", light: ["#fbe7ef", "#a33162"], dark: ["#3b2130", "#f6a8ca"] },
} as const;

/** Outline service symbols on quiet colour discs, following the selected PocketPal reference.
 * Uses the existing icon font; no image requests, perspective, gradients or shadows.
 */
export function ActionIcon({ name, size = 56 }: { name: ActionIconName; size?: number }) {
  const { mode } = useTheme();
  const icon = icons[name];
  const [background, foreground] = mode === "dark" ? icon.dark : icon.light;
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    pointerEvents="none" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background,
      alignItems: "center", justifyContent: "center" }}>
    <Ionicons name={icon.glyph} size={Math.round(size * .5)} color={foreground} accessible={false} />
  </View>;
}
