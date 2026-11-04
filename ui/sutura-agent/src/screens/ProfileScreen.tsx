import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { BackHeader } from "../components/AppHeader";
import { Card, PrimaryButton } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAgent } from "../context/AgentContext";
import { colors, fonts, spacing } from "../theme";

function Row({ label, value }: { label: string; value: string }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { signOut } = useAuth();
  const { session, stats, setTab } = useAgent();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BackHeader title="Agent profile" onBack={() => setTab("more")} />

      <Card style={styles.card}>
        <Row label="Name" value={session.name} />
        <Row label="Account" value={session.agentCode} />
        <Row label="Location" value={session.location || "—"} />
        <Row label="Phone" value={session.phone || "—"} />
        <Row label="Email" value={session.email || "Not provided"} />
      </Card>

      <Card style={styles.card}>
        <Row label="Completed today" value={String(stats.completedToday)} />
        <Row label="Pending queue" value={String(stats.pendingCount)} />
        <Row label="Cash-in today" value={String(stats.todayDeposits)} />
        <Row label="Cash-out today" value={String(stats.todayWithdrawals)} />
      </Card>

      <PrimaryButton
        label="Log out"
        color={colors.rose500}
        onPress={() => {
          void signOut();
        }}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  card: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500 },
  value: { fontSize: 14, fontFamily: fonts.bold, color: colors.slate900, textAlign: "right", flex: 1 },
});
