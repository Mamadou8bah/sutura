import { NativeTabBar, supportsNativeTabs } from "./NativeTabBar";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "../constants/brand";
import { colors, fonts, radii } from "../theme";
import type { TabId } from "../types";

type NavItem = { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap };

const tabs: NavItem[] = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "wallets", label: "Wallets", icon: "wallet-outline" },
  { id: "scan", label: "Scan", icon: "scan-outline" },
  { id: "activity", label: "Activity", icon: "receipt-outline" },
  { id: "more", label: "More", icon: "person-outline" },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (supportsNativeTabs) return <NativeTabBar active={active} tabs={tabs.map(tab => ({ ...tab, value: tab.id }))} onChange={value => onChange(value as TabId)} />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.capsule}>
        {tabs.map((item) => {
          const isActive = active === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(item.id)}
              style={[styles.item, isActive && styles.itemActive]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? colors.orange : colors.slate500}
              />
              <Text numberOfLines={1} style={[styles.label, { color: isActive ? colors.orange : colors.slate500 }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: colors.surface,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000000",
    shadowOpacity: 0,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 0,
  },
  item: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    minWidth: 0,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 0,
  },
  itemActive: {
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.white,
  },
});
