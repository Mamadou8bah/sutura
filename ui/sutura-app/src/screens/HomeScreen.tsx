import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { AppHeader } from "../components/AppHeader";
import { TransactionRow } from "../components/TransactionRow";
import { WalletOverview } from "../components/WalletOverview";
import { useWallet } from "../context/WalletContext";
import { fonts, spacing, type ThemeColors } from "../theme";
import { formatBalance } from "../utils/format";

export function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { data, loading, setTab, recentTransactions, selectedWallet, balanceHidden } = useWallet();
  const completed = data.transactions.filter(transaction => transaction.status === "COMPLETED" && transaction.currency === selectedWallet.currency);
  const incoming = completed.filter(transaction => transaction.type === "TRANSFER_IN" || transaction.type === "DEPOSIT").reduce((sum, transaction) => sum + transaction.amount, 0);
  const outgoing = completed.filter(transaction => transaction.type === "TRANSFER_OUT" || transaction.type === "WITHDRAWAL").reduce((sum, transaction) => sum + transaction.amount, 0);

  if (loading && data.wallets.length === 0) return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading wallets" color={colors.primary}/></View>;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <AppHeader/>
    {data.wallets.length ? <View style={styles.balancePanel}><View style={styles.accent}/><WalletOverview/></View> : <Pressable accessibilityRole="button" onPress={() => setTab("wallets")} style={styles.balancePanel}><Text style={styles.sectionTitle}>Create your first wallet</Text><Text style={styles.muted}>Add a wallet to start using Sutura.</Text></Pressable>}
    {data.wallets.length > 0 && <View style={styles.actions}>
      {[{label:"Transfer",hint:"Send by phone number",icon:"arrow-up-outline" as const,tab:"send" as const},{label:"Withdraw",hint:"Collect cash from an agent",icon:"cash-outline" as const,tab:"withdraw" as const}].map(action => <Pressable accessibilityRole="button" accessibilityLabel={action.label} key={action.tab} onPress={() => setTab(action.tab)} style={({pressed}) => [styles.action,{opacity:pressed?0.7:1}]}><View style={styles.actionTop}><View style={styles.actionIcon}><Ionicons name={action.icon} size={22} color={colors.orange}/></View><Ionicons name="arrow-forward" size={16} color={colors.slate500}/></View><Text style={styles.actionTitle}>{action.label}</Text><Text style={styles.actionHint}>{action.hint}</Text></Pressable>)}
    </View>}
    {completed.length > 0 && <View style={styles.movement}>
      <Text style={styles.eyebrow}>RECORDED MOVEMENT · {selectedWallet.currency}</Text>
      <View style={styles.metrics}>{[{label:"Money in",amount:incoming,icon:"arrow-down" as const},{label:"Money out",amount:outgoing,icon:"arrow-up" as const}].map(metric => <View key={metric.label} style={styles.metric}><View style={styles.metricLabel}><Ionicons name={metric.icon} size={14} color={colors.slate500}/><Text style={styles.muted}>{metric.label}</Text></View><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{formatBalance(metric.amount,selectedWallet.currency,balanceHidden)}</Text></View>)}</View>
      <Text style={styles.caption}>Completed transactions in your activity history.</Text>
    </View>}
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent transactions</Text>{recentTransactions.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="See all transactions" onPress={() => setTab("activity")}><Text style={styles.seeAll}>See all</Text></Pressable>}</View>
    {recentTransactions.length === 0 ? <View style={styles.empty}>
      <View style={styles.emptyIllustration}><View style={styles.emptyLine}/><View style={styles.emptySymbol}><Ionicons name="swap-horizontal" size={30} color={colors.orange}/></View><View style={styles.emptyLine}/></View>
      <Text style={styles.emptyTitle}>Your next move starts here</Text><Text style={styles.emptyHint}>Add money, send to a phone number, or collect cash. Your transactions will appear here.</Text>
      <View style={styles.emptySteps}>{["Add money","Send","Track"].map((label,index) => <View style={styles.emptyStep} key={label}><Text style={styles.stepNumber}>{index+1}</Text><Text style={styles.caption}>{label}</Text></View>)}</View>
    </View> : <View>{recentTransactions.map(transaction => <TransactionRow key={transaction.id} txn={transaction}/>)}</View>}
  </ScrollView>;
}

const createStyles = (colors:ThemeColors) => StyleSheet.create({
  loading:{flex:1,justifyContent:"center",alignItems:"center"},
  content:{padding:spacing.screen,paddingBottom:24,gap:16},
  balancePanel:{backgroundColor:colors.surfaceMuted,borderRadius:16,paddingHorizontal:18,paddingVertical:12,overflow:"hidden"},
  accent:{height:3,width:36,backgroundColor:colors.orange,borderRadius:2,marginTop:4},
  actions:{flexDirection:"row",gap:12},action:{flex:1,minWidth:0,backgroundColor:colors.orange,borderWidth:1,borderColor:colors.orange,borderRadius:12,padding:14,gap:8},
  actionTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},actionIcon:{width:36,height:36,alignItems:"center",justifyContent:"center",backgroundColor:colors.orangeLight,borderRadius:10},
  actionTitle:{fontSize:16,fontFamily:fonts.bold,color:"#181a20"},actionHint:{fontSize:11,lineHeight:16,color:"#38291d"},
  movement:{gap:14,paddingVertical:6},eyebrow:{fontSize:10,letterSpacing:1,fontFamily:fonts.medium,color:colors.slate500},metrics:{flexDirection:"row",gap:16},metric:{flex:1,minWidth:0,gap:7},metricLabel:{flexDirection:"row",alignItems:"center",gap:5},metricValue:{fontSize:19,fontFamily:fonts.bold,color:colors.primary},
  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},sectionTitle:{fontSize:18,fontFamily:fonts.bold,color:colors.primary},seeAll:{fontSize:12,color:colors.slate500},muted:{fontSize:12,color:colors.slate500},caption:{fontSize:10,lineHeight:16,color:colors.slate500},
  empty:{borderWidth:1,borderColor:colors.border,borderStyle:"dashed",borderRadius:16,padding:16,alignItems:"center",gap:12},emptyIllustration:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12,width:"100%"},emptyLine:{height:1,flex:1,backgroundColor:colors.border},emptySymbol:{width:58,height:58,borderRadius:29,backgroundColor:colors.orangeLight,alignItems:"center",justifyContent:"center"},emptyTitle:{fontSize:17,fontFamily:fonts.bold,color:colors.primary,textAlign:"center"},emptyHint:{fontSize:12,lineHeight:19,color:colors.slate500,textAlign:"center"},emptySteps:{flexDirection:"row",width:"100%",justifyContent:"space-between",gap:8,paddingTop:6},emptyStep:{alignItems:"center",gap:5},stepNumber:{fontSize:11,fontFamily:fonts.bold,color:colors.primary,backgroundColor:colors.surfaceMuted,width:24,height:24,lineHeight:24,textAlign:"center",borderRadius:12}
});
