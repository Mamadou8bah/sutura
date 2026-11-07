import type { CustomerTransaction } from "../types";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { TransactionRow } from "../components/TransactionRow";
import { SelectionSheet } from "../components/SelectionSheet";
import { useWallet } from "../context/WalletContext";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { fonts, spacing, type ThemeColors } from "../theme";
import { formatBalance } from "../utils/format";

type Mode = "history" | "expenses" | "income";
type Period = "day" | "week" | "month" | "6month";
const periods:{id:Period;label:string}[]=[{id:"day",label:"Today"},{id:"week",label:"Last 7 days"},{id:"month",label:"Last month"},{id:"6month",label:"Last 6 months"}];
function periodStart(period:Period) {
 const start=new Date();
 if(period==="day")start.setHours(0,0,0,0);
 else if(period==="week")start.setDate(start.getDate()-7);
 else start.setMonth(start.getMonth()-(period==="month"?1:6));
 return start;
}
export function ActivityScreen() {
 const {colors}=useTheme();const styles=useThemedStyles(createStyles);
 const {data,selectedWallet,balanceHidden}=useWallet();
 const [mode,setMode]=useState<Mode>("history");const [period,setPeriod]=useState<Period>("month");const [periodOpen,setPeriodOpen]=useState(false);
 const currency=selectedWallet.currency;
 const transactions=useMemo(()=>{
  const start=periodStart(period);
  return data.transactions.filter(transaction=>{
   const date=new Date(transaction.time);
   if(transaction.currency!==currency||Number.isNaN(date.getTime())||date<start)return false;
   if(mode==="history")return true;
   if(transaction.status!=="COMPLETED")return false;
   const credit=transaction.type==="TRANSFER_IN"||transaction.type==="DEPOSIT";
   return mode==="income"?credit:!credit;
  }).sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime());
 },[data.transactions,currency,mode,period]);
 const completed=transactions.filter(transaction=>transaction.status==="COMPLETED");
 const incoming=completed.filter(transaction=>transaction.type==="DEPOSIT"||transaction.type==="TRANSFER_IN").reduce((sum,transaction)=>sum+transaction.amount,0);
 const outgoing=completed.filter(transaction=>transaction.type==="WITHDRAWAL"||transaction.type==="TRANSFER_OUT").reduce((sum,transaction)=>sum+transaction.amount,0);
 const summary=mode==="history"?[{label:"Money in",amount:incoming},{label:"Money out",amount:outgoing}]:[{label:mode==="income"?"Total received":"Total spent",amount:mode==="income"?incoming:outgoing}];
 return <View style={{flex:1}}><FlatList<CustomerTransaction> data={transactions} keyExtractor={transaction=>transaction.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
 ListHeaderComponent={<View style={styles.header}>
  <View style={styles.titleRow}><Text style={styles.title}>Activity</Text><Text style={styles.currency}>{currency}</Text></View>
  <View accessibilityRole="tablist" style={styles.tabs}>{([{id:"history",label:"History"},{id:"expenses",label:"Expenses"},{id:"income",label:"Income"}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:mode===tab.id}} onPress={()=>setMode(tab.id)} style={[styles.tab,mode===tab.id&&styles.activeTab]}><Text style={[styles.tabText,mode===tab.id&&{color:colors.primary}]}>{tab.label}</Text></Pressable>)}</View>
  <Pressable accessibilityRole="button" accessibilityLabel="Filter activity period" onPress={()=>setPeriodOpen(true)} style={styles.period}><Ionicons name="calendar-outline" size={16} color={colors.slate500}/><Text style={styles.periodText}>{periods.find(item=>item.id===period)?.label}</Text><Ionicons name="chevron-down" size={14} color={colors.slate500}/></Pressable>
  <View style={styles.summary}><View style={styles.accent}/><View style={styles.metrics}>{summary.map(metric=><View key={metric.label} style={styles.metric}><Text style={styles.metricLabel}>{metric.label}</Text><Text style={styles.metricValue}>{formatBalance(metric.amount,currency,balanceHidden)}</Text></View>)}</View><Text style={styles.caption}>Completed payments only · {currency}</Text></View>
  <View style={styles.titleRow}><Text style={styles.sectionTitle}>{mode==="history"?"Transactions":mode==="income"?"Incoming payments":"Outgoing payments"}</Text><Text style={styles.caption}>{transactions.length}</Text></View>
 </View>}
 ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={30} color={colors.orange}/></View><Text style={styles.emptyTitle}>No {mode==="history"?"transactions":mode} in this period</Text><Text style={styles.emptyHint}>Try another period. Your {currency} payments will appear here.</Text></View>}
 renderItem={({item}: {item: CustomerTransaction})=><TransactionRow txn={item}/>}/>
 <SelectionSheet visible={periodOpen} title="Activity period" onClose={()=>setPeriodOpen(false)}>{periods.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{checked:period===option.id}} onPress={()=>{setPeriod(option.id);setPeriodOpen(false);}} style={styles.periodOption}><Text style={styles.periodText}>{option.label}</Text>{period===option.id&&<Ionicons name="checkmark" size={20} color={colors.orange}/>}</Pressable>)}</SelectionSheet>
 </View>;
}
const createStyles=(colors:ThemeColors)=>StyleSheet.create({
 content:{padding:spacing.screen,paddingBottom:32},header:{gap:20,marginBottom:8},titleRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},title:{fontFamily:fonts.bold,fontSize:26,color:colors.primary},currency:{fontFamily:fonts.medium,fontSize:12,color:colors.slate500,backgroundColor:colors.surfaceMuted,paddingHorizontal:12,paddingVertical:7,borderRadius:8},
 tabs:{flexDirection:"row",gap:24,borderBottomWidth:1,borderBottomColor:colors.border},tab:{paddingVertical:12,borderBottomWidth:2,borderBottomColor:"transparent"},activeTab:{borderBottomColor:colors.orange},tabText:{fontFamily:fonts.medium,fontSize:14,color:colors.slate500},
 period:{flexDirection:"row",alignItems:"center",gap:8,alignSelf:"flex-start",paddingVertical:10,paddingHorizontal:12,backgroundColor:colors.surfaceMuted,borderRadius:8},periodText:{fontSize:14,color:colors.primary,fontFamily:fonts.medium},periodOption:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:20,borderBottomWidth:1,borderBottomColor:colors.border},
 summary:{backgroundColor:colors.surfaceMuted,borderRadius:16,padding:18,gap:16},accent:{width:28,height:3,borderRadius:2,backgroundColor:colors.orange},metrics:{flexDirection:"row",gap:14},metric:{flex:1,minWidth:0,gap:8},metricLabel:{fontSize:12,color:colors.slate500},metricValue:{fontSize:18,fontFamily:fonts.bold,color:colors.primary},caption:{fontSize:11,color:colors.slate500,lineHeight:17},sectionTitle:{fontSize:18,fontFamily:fonts.bold,color:colors.primary},
 empty:{alignItems:"center",gap:12,padding:24,borderRadius:16,borderWidth:1,borderStyle:"dashed",borderColor:colors.border,marginTop:12},emptyIcon:{width:58,height:58,borderRadius:29,alignItems:"center",justifyContent:"center",backgroundColor:colors.orangeLight},emptyTitle:{fontSize:16,fontFamily:fonts.bold,color:colors.primary,textAlign:"center"},emptyHint:{fontSize:12,lineHeight:19,color:colors.slate500,textAlign:"center"}
});
