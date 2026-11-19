import { Ionicons } from "@expo/vector-icons";

/**
 * Same API and names as the SVG `Icon` in sutura-app and merchant-app (zender
 * line icons). The agent app does not ship react-native-svg, and adding it would
 * need a new APK (OTA updates cannot install native modules), so this copy maps
 * the names to Ionicons outline glyphs instead.
 */
const glyphs = {
  home: "home-outline",
  wallet: "wallet-outline",
  scan: "scan-outline",
  receipt: "receipt-outline",
  grid: "grid-outline",
  clock: "time-outline",
  qr: "qr-code-outline",
  user: "person-outline",
} as const;

export type IconName = keyof typeof glyphs;

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return <Ionicons name={glyphs[name]} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
