import {Ionicons} from "@expo/vector-icons";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { AppHeader } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { StatsCarousel } from "../components/StatsCarousel";
import { useAgent } from "../context/AgentContext";
import { colors, fonts, spacing } from "../theme";

export function HomeScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { stats, setTab, recentCompleted, openOperation } = useAgent();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppHeader />

      <StatsCarousel stats={stats} />

      <QuickActionGrid
        actions={[
          {
            label: "Cash-in",
            hint: "Deposit for a customer",
            icon: "arrow-down-circle-outline",
            color: colors.emerald700,
            onPress: () => setTab("new-deposit"),
          },
          {
            label: "Cash-out",
            hint: "Withdraw for a customer",
            icon: "arrow-up-circle-outline",
            color: colors.primary,
            onPress: () => setTab("new-withdrawal"),
          },
        ]}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent completions</Text>
        <Pressable onPress={() => setTab("activity")}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {recentCompleted.length === 0 && <View style={{borderWidth:1,borderStyle:"dashed",borderColor:colors.border,borderRadius:16,padding:24,alignItems:"center",gap:12}}><Ionicons name="receipt-outline" size={30} color={colors.orange}/><Text style={{fontFamily:fonts.medium,color:colors.primary,fontSize:16,textAlign:"center"}}>Ready for your next customer</Text><Text style={{fontFamily:fonts.regular,color:colors.slate500,fontSize:12,textAlign:"center",lineHeight:19}}>Your completed cash-in and cash-out operations will appear here.</Text></View>}
      {recentCompleted.map((op) => (
        <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 24, gap: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.slate900 },
  seeAll: { fontSize: 14, fontFamily: fonts.medium, color: colors.primary },
});
