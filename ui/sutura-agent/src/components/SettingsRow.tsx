import type {ReactNode} from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import {Ionicons} from "@expo/vector-icons";
import {useTheme} from "../context/ThemeContext";
import {fonts} from "../theme";
export function SettingsRow({label,hint,value,icon,onPress,trailing}:{label:string;hint?:string;value?:string;icon:React.ComponentProps<typeof Ionicons>["name"];onPress?:()=>void;trailing?:ReactNode}){const {colors}=useTheme();const content=<><Ionicons name={icon} size={22} color={colors.primary}/><View style={{flex:1,gap:5}}><Text style={{fontFamily:fonts.medium,color:colors.primary,fontSize:15}}>{label}</Text>{hint&&<Text style={{fontFamily:fonts.regular,color:colors.slate500,fontSize:12,lineHeight:18}}>{hint}</Text>}</View>{trailing||<Text style={{fontFamily:fonts.regular,color:colors.slate500,fontSize:13,flexShrink:1}}>{value||""}</Text>}{onPress&&<Ionicons name="chevron-forward" size={17} color={colors.slate500}/>}</>;const style={flexDirection:"row" as const,alignItems:"center" as const,gap:14,paddingVertical:18,borderBottomWidth:1,borderBottomColor:colors.border};return onPress?<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={style}>{content}</Pressable>:<View style={style}>{content}</View>;}
