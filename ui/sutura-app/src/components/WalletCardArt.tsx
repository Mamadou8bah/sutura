import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { brand } from "../constants/brand";

export function WalletCardArt({ variant = "carousel" }: { variant?: "carousel" | "compact" }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const height = variant === "carousel" ? 180 : 88;

  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMid slice">
        <Defs>
          <LinearGradient id="orangeGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.orange} stopOpacity="0.45" />
            <Stop offset="1" stopColor={brand.orange} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="swoosh" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={brand.orange} stopOpacity="0.15" />
            <Stop offset="0.5" stopColor={brand.orange} stopOpacity="0.55" />
            <Stop offset="1" stopColor={brand.orangeBright} stopOpacity="0.25" />
          </LinearGradient>
        </Defs>

        {/* Large ambient glow */}
        <Circle cx="270" cy="40" r="90" fill="url(#orangeGlow)" />

        {/* Motion swooshes inspired by Sutura mark */}
        <Path
          d="M 220 10 C 260 30, 300 50, 310 90 C 280 70, 240 55, 200 48"
          stroke="url(#swoosh)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
        <Path
          d="M 240 30 C 275 55, 305 85, 315 130 C 275 105, 235 88, 190 78"
          stroke="#ffffff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.08"
        />
        <Path
          d="M 180 120 C 215 95, 255 75, 300 65 L 318 78 L 295 95 Z"
          fill={brand.orange}
          opacity="0.85"
        />

        {/* Secondary arcs */}
        <Ellipse cx="60" cy="150" rx="70" ry="40" fill={brand.orange} opacity="0.07" />
        <Path
          d="M -10 140 Q 80 90, 160 110"
          stroke={brand.orange}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity="0.2"
        />
        <Circle cx="28" cy="28" r="18" fill="#ffffff" opacity="0.04" />
        <Circle cx="140" cy="18" r="10" fill={brand.orange} opacity="0.18" />
      </Svg>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
});
