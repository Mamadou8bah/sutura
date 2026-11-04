import {fonts as appFonts} from "../theme";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radii } from "../theme";

type Action = {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

export function QuickActionGrid({ actions }: { actions: Action[] }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable accessibilityRole="button" accessibilityLabel={action.label} key={action.label} onPress={action.onPress} style={styles.item}>
          <View style={styles.circle}>
            <Ionicons name={action.icon} size={22} color={colors.orange} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
          {!!action.hint&&<Text style={styles.hint}>{action.hint}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: "row", gap:12 },
  item: { flex:1, minWidth:0, padding:14, borderWidth:1, borderColor:colors.border, borderRadius:12, gap:8 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",

  },
  label: { fontSize:16, fontFamily:fonts.bold, color:colors.primary },
  hint:{fontFamily: appFonts.regular,fontSize:11,lineHeight:16,color:colors.slate500},
});
