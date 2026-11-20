import { useNativeHeader } from "./NativeControls";
import { Platform } from "react-native";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { SuturaLogo } from "./SuturaLogo";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";

export function AppHeader() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { data, setTab } = useWallet();

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => setTab("more")} style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}><SuturaLogo size={44} /></Pressable>
      <View style={styles.greeting}>
        <Text style={{ fontSize: 12, color: colors.slate500 }}>Welcome back</Text>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.greetingName}>{data.session.name || "Home"}</Text>

      </View>

    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.titleWrap}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const nativeHeader = useNativeHeader(title); if (nativeHeader) return null;
  return (
    <View style={styles.backRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack} style={styles.backBtn}>
        <Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} size={22} color={colors.primary} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.backTitle}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { flex: 1, minWidth: 0 },
  greetingName: { fontSize: 17, fontWeight: "600", color: colors.primary },
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
  badgeText: { color: colors.background, fontSize: 12, lineHeight: 16, fontWeight: "600" },
  titleWrap: { marginBottom: 4 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "600", color: colors.primary },
  subtitle: { fontSize: 15, color: colors.slate500, marginTop: 4 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.primary },
  backSpacer: { width: 48 },
});
