import Svg, { Path } from "react-native-svg";

/**
 * Line icons for navigation, ported from zender `packages/ui/src/icons.tsx`
 * (24 viewBox, 2-px stroke, round caps). Same names in all three apps.
 */
const paths = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  wallet: "M3 6.5A2.5 2.5 0 0 1 5.5 4H18v3M3 6.5V18a2 2 0 0 0 2 2h15V7H5.5A2.5 2.5 0 0 1 3 4.5M16.5 13.5h.01",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  receipt: "M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21zM9 8h6M9 12h6M9 16h3",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d={paths[name]} />
  </Svg>;
}
