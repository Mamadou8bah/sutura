import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, PixelRatio, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { fonts, radii, type } from "../theme";

const HOLD_MS = 650;

function useAccessibilityPrefs() {
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled?.().then(v => { if (active) setScreenReader(v); }).catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled?.().then(v => { if (active) setReduceMotion(v); }).catch(() => {});
    const a = AccessibilityInfo.addEventListener?.("screenReaderChanged", setScreenReader);
    const b = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => { active = false; a?.remove(); b?.remove(); };
  }, []);
  return { screenReader, reduceMotion };
}

/**
 * Primary action for irreversible money steps (pattern from zender rider `HoldButton`).
 *
 * Touch: press and hold until the bar fills; a short tap only shows the hint, so a
 * brush of the screen cannot move money. Screen readers (double-tap or the
 * "activate" action), keyboards and the browser build confirm on a single
 * activation, so the control stays fully accessible. Under Reduce Motion the
 * bar does not animate; the hold still applies and the label says what to do.
 * The caller keeps its idempotency key and in-flight guard; this never retries.
 */
export function HoldToConfirm({ label, onConfirm, disabled = false, loading = false, loadingLabel = "Processing…" }: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const { colors } = useTheme();
  const { screenReader, reduceMotion } = useAccessibilityPrefs();
  const tapMode = screenReader || Platform.OS === "web";
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const inactive = disabled || loading;
  useEffect(() => () => clearTimeout(timer.current), []);

  const confirm = () => { if (inactive) return; setHint(false); onConfirm(); };
  const start = () => {
    if (inactive || tapMode) return;
    fired.current = false; setHint(false); setHolding(true);
    clearTimeout(timer.current);
    if (!reduceMotion) Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
    timer.current = setTimeout(() => { fired.current = true; setHolding(false); progress.setValue(0); confirm(); }, HOLD_MS);
  };
  const cancel = () => {
    if (tapMode) return;
    clearTimeout(timer.current);
    progress.stopAnimation(); progress.setValue(0);
    if (holding && !fired.current) setHint(true);
    setHolding(false);
  };
  const height = Math.max(56, Math.round(24 * PixelRatio.getFontScale() + 24));
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const shown = loading ? loadingLabel : holding && reduceMotion ? "Keep holding…" : label;

  return <View style={styles.wrap}>
    <Pressable disabled={inactive} accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={tapMode ? undefined : "Press and hold to confirm."}
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={event => { if (event.nativeEvent.actionName === "activate") confirm(); }}
      onPressIn={start} onPressOut={cancel} onPress={() => { if (tapMode) confirm(); }}
      android_ripple={{ color: "transparent" }}
      style={[styles.button, { minHeight: height, backgroundColor: colors.orange, opacity: disabled && !loading ? 0.45 : 1 }]}>
      <Animated.View pointerEvents="none" style={[styles.fill, { width }]} />
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={colors.onAccent} /> : null}
        <Text style={[styles.label, { color: colors.onAccent }]}>{shown}</Text>
      </View>
    </Pressable>
    {!tapMode && !loading ? <Text accessibilityLiveRegion={hint ? "polite" : "none"} style={[styles.hint, { color: hint ? colors.primary : colors.slate500 }]}>
      {hint ? "Keep holding until the bar fills." : "Press and hold to confirm."}
    </Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  button: { borderRadius: 999, overflow: "hidden", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.16)" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "100%" },
  label: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", textAlign: "center", flexShrink: 1 },
  hint: { fontSize: type.caption, textAlign: "center" },
});
