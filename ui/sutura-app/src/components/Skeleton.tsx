import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { useTheme } from "../context/ThemeContext";

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then(value => { if (active) setReduce(value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduce);
    return () => { active = false; sub?.remove(); };
  }, []);
  return reduce;
}

/** Placeholder block. Pulses gently; holds still under Reduce Motion. */
export function Skeleton({ width = "100%", height = 14, radius = 6 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) { opacity.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity, reduce]);
  return <Animated.View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
    style={{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }} />;
}

/** Rows that mirror a list while it loads. Announced once as "Loading". */
export function SkeletonRows({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.rows}>
    {Array.from({ length: rows }, (_, i) => <View key={i} style={styles.row}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={styles.lines}>
        <Skeleton width={`${55 + ((i * 17) % 30)}%`} />
        <Skeleton width={`${30 + ((i * 11) % 25)}%`} height={11} />
      </View>
      <Skeleton width={72} height={14} />
    </View>)}
  </View>;
}

/** Balance card placeholder. */
export function SkeletonBalance({ label = "Loading balance" }: { label?: string }) {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.balance}>
    <Skeleton width={120} height={13} />
    <Skeleton width="70%" height={36} radius={8} />
    <Skeleton width={96} height={13} />
  </View>;
}

const styles = StyleSheet.create({
  rows: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  lines: { flex: 1, gap: 8 },
  balance: { gap: 12, paddingVertical: 8 },
});
