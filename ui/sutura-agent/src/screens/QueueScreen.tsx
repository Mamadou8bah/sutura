import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { ScreenTitle } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { useAgent } from "../context/AgentContext";
import { colors, fonts, spacing } from "../theme";

export function QueueScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { pending, openOperation,refreshHistory,historyLoading,historyError } = useAgent();

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={()=>void refreshHistory()}/>} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTitle
        title="Pending queue"
        subtitle={`${pending.length} operation${pending.length === 1 ? "" : "s"} awaiting completion`}
      />

      {!!historyError&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{historyError}</Text>}<Pressable accessibilityRole="button" onPress={()=>void refreshHistory()} disabled={historyLoading}><Text style={{color:colors.primary,paddingVertical:14}}>{historyLoading?"Refreshing…":"Refresh queue"}</Text></Pressable>
      {pending.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Queue is clear</Text>
          <Text style={styles.emptySub}>New customer QR codes will appear here when scanned.</Text>
        </View>
      ) : (
        pending.map((op) => <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />)
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32 },
  empty: {
    marginTop: 40,
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.slate900 },
  emptySub: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, marginTop: 8, textAlign: "center" },
});
