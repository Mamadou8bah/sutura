import { useNativeHeader } from "./NativeControls";
import { Platform } from "react-native";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { SuturaLogo } from "./SuturaLogo";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useAgent } from "../context/AgentContext";
import { fonts, radii, type } from "../theme";

export function AppHeader() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { session, stats, setTab } = useAgent();

  return (
    <View style={styles.row}>
      <SuturaLogo size={44} />
      <View style={styles.greeting}>
        <Text numberOfLines={1} accessibilityRole="header" style={styles.greetingName}>{session.name}</Text>
        {[session.agentCode, session.location].filter(Boolean).length > 0 ? <Text numberOfLines={1} style={styles.agentMeta}>
          {[session.agentCode, session.location].filter(Boolean).join(" · ")}
        </Text> : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Support" style={styles.iconBtn} onPress={() => setTab("support")}>
        <Ionicons name="chatbubble-outline" size={22} color={colors.slate700} />
      </Pressable>

    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.titleWrap}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const nativeHeader = useNativeHeader(title); if (nativeHeader) return null;
  return (
    <View style={styles.backRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack} style={styles.backBtn}>
        <Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} size={22} color={colors.primary} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.backTitle}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { flex: 1, minWidth: 0 },
  greetingName: { fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  agentMeta: { fontSize: type.caption, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    minHeight: 18,
    borderRadius: 9,
    backgroundColor: colors.dangerFg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.surface, fontSize: type.tab, lineHeight: 16, fontFamily: fonts.semibold, fontWeight: "600" },
  titleWrap: { marginBottom: 4 },
  title: { fontSize: type.title, lineHeight: 34, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  subtitle: { fontSize: type.body, lineHeight: 21, fontFamily: fonts.regular, color: colors.slate500, marginTop: 4 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backTitle: { flex: 1, textAlign: "center", fontSize: type.headline, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary },
  backSpacer: { width: 48 },
});
