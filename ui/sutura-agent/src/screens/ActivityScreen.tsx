import {fonts as appFonts} from "../theme";
import { Ionicons } from "@expo/vector-icons";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { ScreenTitle } from "../components/AppHeader";
import { OperationRow } from "../components/OperationRow";
import { useAgent } from "../context/AgentContext";
import { spacing } from "../theme";

export function ActivityScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { completed, openOperation,refreshHistory,historyError,historyLoading } = useAgent();

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={()=>void refreshHistory()}/>} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenTitle title="Activity" subtitle="Your recent completed cash operations" />

      <View style={{padding:20,backgroundColor:colors.surfaceMuted,borderRadius:16,gap:12,marginVertical:20}}><View style={{height:3,width:28,backgroundColor:colors.orange,borderRadius:2}}/><Text style={{fontFamily: appFonts.regular,fontSize:12,color:colors.slate500}}>Recent completed operations</Text><Text style={{fontFamily: appFonts.bold,fontSize:30,fontWeight:"700",color:colors.primary}}>{completed.length}</Text></View>
      {!!historyError&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{historyError}</Text>}<Pressable accessibilityRole="button" disabled={historyLoading} onPress={()=>void refreshHistory()}><Text style={{color:colors.primary,paddingVertical:12}}>{historyLoading?"Refreshing…":"Refresh activity"}</Text></Pressable>
      {completed.length === 0 && <View style={{padding:24,borderWidth:1,borderStyle:"dashed",borderColor:colors.border,borderRadius:16,alignItems:"center",gap:12}}><Ionicons name="receipt-outline" size={32} color={colors.orange}/><Text style={{fontFamily: appFonts.medium,fontSize:16,fontWeight:"600",color:colors.primary}}>No completed operations yet</Text><Text style={{fontFamily: appFonts.regular,fontSize:12,lineHeight:19,textAlign:"center",color:colors.slate500}}>Completed cash-in and cash-out operations will appear here.</Text></View>}
      {completed.map((op) => (
        <OperationRow key={op.reference} op={op} onPress={() => openOperation(op)} />
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32 },
});
