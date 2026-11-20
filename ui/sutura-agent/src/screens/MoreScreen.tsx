import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { KeyboardScrollView as ScrollView } from "../components/KeyboardScrollView";
import { StyleSheet, View} from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "../components/AppHeader";
import { useAgent } from "../context/AgentContext";
import { colors, fonts, radii, shadow, spacing } from "../theme";
import type { TabId } from "../types";

type MenuItem = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tab: TabId;
};

const menuItems: MenuItem[] = [
  { label: "Settings", subtitle: "Appearance and app preferences", icon: "settings-outline", tab: "settings" },
  { label: "Support", subtitle: "Contact Sutura operations", icon: "chatbubbles-outline", tab: "support" },
];

export function MoreScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { session, setTab } = useAgent();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTitle title="More" subtitle="Agent tools and account" />

      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{session.name}</Text>
          {[session.agentCode, session.location].filter(Boolean).length > 0 ? <Text style={styles.meta}>
            {[session.agentCode, session.location].filter(Boolean).join(" · ")}
          </Text> : null}
          {session.phone ? <Text style={styles.phone}>{session.phone}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="View agent profile" onPress={() => setTab("profile")} style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.editLink}>View</Text>
        </Pressable>
      </View>

      {menuItems.map((item) => (
        <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={item.subtitle} key={item.label} onPress={() => setTab(item.tab)} style={styles.menuRow}>
          <View style={styles.menuIcon}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.menuBody}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuSub}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 20, gap: 0 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 17, fontFamily: fonts.medium, color: colors.primary },
  meta: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  phone: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  editLink: { fontSize: 15, fontFamily: fonts.medium, color: colors.accentText },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: fonts.medium, color: colors.primary },
  menuSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
});
