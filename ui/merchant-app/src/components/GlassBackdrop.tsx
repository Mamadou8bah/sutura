import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { useTheme } from "../context/ThemeContext";

/** A bounded material layer; foreground content stays sharp and interactive. */
export function GlassBackdrop() {
  const { colors, mode } = useTheme();
  const target = useRef<ComponentRef<typeof View> | null>(null);
  const [solid, setSolid] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setSolid(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setSolid);
    return () => { active = false; listener.remove(); };
  }, []);
  let nativeGlass = false;
  if (Platform.OS === "ios" && !solid) {
    try { nativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable(); } catch {}
  }
  if (solid) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
    <BlurTargetView ref={target} style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceMuted }]}>
      <View style={{ position: "absolute", width: 180, height: 120, right: -35, top: -65,
        borderRadius: 90, backgroundColor: colors.orange, opacity: mode === "dark" ? 0.22 : 0.14 }} />
      <View style={{ position: "absolute", width: 160, height: 100, left: -50, bottom: -65,
        borderRadius: 80, backgroundColor: colors.surface, opacity: 0.8 }} />
    </BlurTargetView>
    {nativeGlass ? <GlassView colorScheme={mode} glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
      : <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={65}
          tint={mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />}
    <View style={[StyleSheet.absoluteFill, { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth,
      borderColor: mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)" }]} />
  </View>;
}
