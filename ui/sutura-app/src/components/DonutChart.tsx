import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import Svg, { Circle, G } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { colors, radii, shadow } from "../theme";
import type { StatCategory } from "../types";
import { formatMoney } from "../utils/format";

export function DonutChart({
  categories,
  total,
  currency,
  centerLabel,
}: {
  categories: StatCategory[];
  total: number;
  currency: string;
  centerLabel: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const size = 200;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={[styles.wrap, shadow.card]}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${cx}, ${cy}`}>
            <Circle cx={cx} cy={cy} r={radius} stroke={colors.surfaceMuted} strokeWidth={stroke} fill="none" />
            {categories.map((cat) => {
              const portion = total > 0 ? cat.amount / total : 0;
              const dash = portion * circumference;
              const el = (
                <Circle
                  key={cat.label}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={cat.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return el;
            })}
          </G>
        </Svg>
        <View style={styles.center}>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
          <Text style={styles.centerValue}>{formatMoney(total, currency)}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {categories.map((cat) => (
          <View key={cat.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: cat.color }]} />
            <Text style={styles.legendLabel}>{cat.label}</Text>
            <Text style={styles.legendAmount}>{formatMoney(cat.amount, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
  },
  chartContainer: { width: 200, height: 200, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center" },
  centerLabel: { fontSize: 12, color: colors.slate500, fontWeight: "600" },
  centerValue: { fontSize: 18, fontWeight: "800", color: colors.slate900, marginTop: 2 },
  legend: { marginTop: 20, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 14, color: colors.slate700, fontWeight: "500" },
  legendAmount: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
});
