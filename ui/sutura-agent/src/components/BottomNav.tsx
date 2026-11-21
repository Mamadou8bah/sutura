import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { Icon, type IconName } from "./Icon";
import { fonts, type, type ThemeColors } from "../theme";
import type { TabId } from "../types";

type NavItem = { id: TabId; label: string; icon: IconName };

const tabs: NavItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "queue", label: "Queue", icon: "clock" },
  { id: "scan", label: "Scan", icon: "scan" },
  { id: "activity", label: "Activity", icon: "receipt" },
  { id: "more", label: "More", icon: "grid" },
];

/** Floating navigation with a dedicated role-specific action. */
export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null;
  return <View style={styles.wrapper}>
    <View pointerEvents="none" style={styles.background} />
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((item, index) => {
        const selected = active === item.id;
        const central = index === 2;
        const tint = selected ? colors.accentText : colors.slate500;
        return <Pressable quiet key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
          aria-selected={selected} accessibilityState={{ selected }} onPress={() => { if (!selected) onChange(item.id); }}
          style={[styles.item, central && styles.centralItem]}>
          <View style={central ? styles.scanCircle : styles.icon}>
            <>{central ? <Ionicons name="add" size={28} color={colors.actionInk} /> : <Icon name={item.icon} size={20} color={tint} strokeWidth={selected ? 2.2 : 1.8} />}</>
          </View>
          {!central && <Text style={[styles.label, { color: tint }, selected && styles.selected]}>{item.label}</Text>}
        </Pressable>;
      })}
    </View>
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  background: { position: "absolute", top: 6, bottom: 8, left: 12, right: 12, borderRadius: 32, backgroundColor: colors.walletHighlight, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center" },
  item: { flex: 1, minWidth: 0, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, paddingVertical: 8 },
  centralItem: { paddingVertical: 6 },
  icon: { height: 28, alignItems: "center", justifyContent: "center" },
  scanCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.actionFill, alignItems: "center", justifyContent: "center" },
  label: { fontSize: type.tab, lineHeight: 16, textAlign: "center", alignSelf: "stretch", fontFamily: fonts.medium },
  selected: { fontFamily: fonts.semibold },
});
