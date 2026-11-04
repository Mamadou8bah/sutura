import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme";

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

export function QuickActionGrid({ actions }: { actions: Action[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable accessibilityRole="button" accessibilityLabel={action.label} key={action.label} onPress={action.onPress} style={styles.item}>
          <View style={styles.circle}>
            <Ionicons name={action.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: "row", justifyContent: "space-between" },
  item: { alignItems: "center", flex: 1 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: { fontSize: 12, fontWeight: "600", color: colors.slate700, textAlign: "center" },
});
