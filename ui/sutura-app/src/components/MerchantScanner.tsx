import { View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
export default function MerchantScanner({onCode}:{onCode:(value:string)=>void}) {
 const {colors}=useTheme();
 return <View style={{padding:32,alignItems:"center",gap:16,backgroundColor:colors.surfaceMuted,borderRadius:16}}><Ionicons name="scan-outline" size={72} color={colors.orange}/><Text style={{textAlign:"center",color:colors.slate500,lineHeight:21}}>Open Sutura on your phone to scan a merchant QR code.</Text></View>;
}
