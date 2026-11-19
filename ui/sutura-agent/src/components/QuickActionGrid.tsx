import { useThemedStyles } from "../context/ThemeContext";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { ActionIcon, type ActionIconName } from "./ActionIcon";
import { fonts, type, type ThemeColors } from "../theme";

type Action = {
  label: string;
  hint?: string;
  artwork: ActionIconName;
  onPress: () => void;
};

/** Labelled flat shortcuts with room for large text. */
export function QuickActionGrid({ actions }: { actions: Action[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.grid}>
      {actions.map(action => (
        <Pressable accessibilityRole="button" accessibilityLabel={action.label} accessibilityHint={action.hint}
          key={action.label} onPress={action.onPress} style={styles.item}>
          <ActionIcon name={action.artwork} />
          <Text style={styles.label}>{action.label}</Text>

        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  item: { flexGrow: 1, flexBasis: 128, minWidth: 0, minHeight: 104, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 8 },
  label: { fontSize: type.body, textAlign: "center", alignSelf: "stretch", fontFamily: fonts.medium, fontWeight: "500", color: colors.primary },
});
