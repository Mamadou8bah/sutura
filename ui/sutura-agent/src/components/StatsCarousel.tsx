import {fonts as appFonts} from "../theme";
import { View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import type { AgentStats } from "../types";
export function StatsCarousel({stats}:{stats:AgentStats}) {
 const {colors}=useTheme();
 return <View style={{backgroundColor:colors.surfaceMuted,borderRadius:16,padding:20,gap:18}}><View style={{width:32,height:3,borderRadius:2,backgroundColor:colors.orange}}/><Text style={{fontFamily: appFonts.regular,fontSize:12,color:colors.slate500}}>Completed today</Text><Text style={{fontFamily: appFonts.bold,fontSize:36,fontWeight:"700",color:colors.primary}}>{stats.completedToday}<Text style={{fontFamily: appFonts.regular,fontSize:14,color:colors.slate500}}>{stats.completedToday===1?" operation":" operations"}</Text></Text><View style={{flexDirection:"row",gap:16}}>{[{label:"Cash-in",value:stats.todayDeposits},{label:"Cash-out",value:stats.todayWithdrawals},{label:"Pending",value:stats.pendingCount}].map(item=><View key={item.label} style={{flex:1,gap:6}}><Text style={{fontFamily: appFonts.regular,fontSize:12,color:colors.slate500}}>{item.label}</Text><Text style={{fontFamily: appFonts.medium,fontSize:20,fontWeight:"600",color:colors.primary}}>{item.value}</Text></View>)}</View></View>;
}
