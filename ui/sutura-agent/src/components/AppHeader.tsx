import { useNativeHeader } from "./NativeControls";
import { Platform } from "react-native";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { SuturaLogo } from "./SuturaLogo";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useAgent } from "../context/AgentContext";
import { colors, fonts, radii } from "../theme";
import { getGreeting } from "../utils/format";

export function AppHeader() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { session, stats, setTab } = useAgent();

  return (
    <View style={styles.row}>
      <SuturaLogo size={44} />
      <View style={styles.greeting}>
        <Text style={styles.greetingLabel}>SUTURA AGENT</Text>
        <Text numberOfLines={1} style={styles.greetingName}>{session.name}</Text>
        <Text style={styles.agentMeta}>
          {[session.agentCode, session.location].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Support" style={styles.iconBtn} onPress={() => setTab("support")}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.slate700} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Pending operations" style={styles.iconBtn} onPress={() => setTab("queue")}>
        <Ionicons name="notifications-outline" size={20} color={colors.slate700} />
        {stats.pendingCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.pendingCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
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
      <Text style={styles.backTitle}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { flex: 1, minWidth: 0 },
  greetingLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.slate500 },
  greetingName: { fontSize: 14, fontFamily: fonts.bold, color: colors.slate900, marginTop: 2 },
  agentMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
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
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose500,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontFamily: fonts.bold },
  titleWrap: { marginBottom: 4 },
  title: { fontSize: 24, fontFamily: fonts.bold, color: colors.slate900 },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, marginTop: 4 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: fonts.bold, color: colors.slate900 },
  backSpacer: { width: 36 },
});
