import { SurfaceBackdrop } from "./SurfaceBackdrop";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
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

/** YouPay-inspired raised centre destination; solid surfaces keep navigation clear. */
export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.wrapper}>
    <View style={styles.background}><SurfaceBackdrop /></View>
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((item, index) => {
        const selected = active === item.id;
        const central = index === 2;
        const tint = selected ? colors.accentText : colors.slate500;
        return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label}
          aria-selected={selected} accessibilityState={{ selected }} onPress={() => { if (!selected) onChange(item.id); }}
          style={[styles.item, central && styles.centralItem]}>
          <View style={central ? styles.scanCircle : styles.icon}>
            <Icon name={item.icon} size={central ? 26 : 22} color={central ? "#ffffff" : tint} strokeWidth={selected ? 2.2 : 1.8} />
          </View>
          <Text style={[styles.label, { color: tint }, selected && styles.selected]}>{item.label}</Text>
          {selected && <View style={styles.dot} />}
        </Pressable>;
      })}
    </View>
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 4, backgroundColor: colors.background },
  background: { position: "absolute", top: 20, bottom: 4, left: 12, right: 12, borderRadius: 26, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "flex-end" },
  item: { flex: 1, minWidth: 0, minHeight: 68, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, paddingVertical: 8 },
  centralItem: { marginTop: -20, paddingTop: 0 },
  icon: { height: 28, alignItems: "center", justifyContent: "center" },
  scanCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: colors.background, backgroundColor: colors.accentText, alignItems: "center", justifyContent: "center" },
  label: { fontSize: type.tab, lineHeight: 16, textAlign: "center", alignSelf: "stretch", fontFamily: fonts.medium },
  selected: { fontFamily: fonts.semibold },
  dot: { position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentText },
});
