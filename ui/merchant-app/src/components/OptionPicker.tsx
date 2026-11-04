import { Platform } from "react-native";
import { NativeSelect } from "./NativeControls";
import {useState} from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import {Ionicons} from "@expo/vector-icons";
import {SelectionSheet} from "./SelectionSheet";
import {useTheme} from "../context/ThemeContext";
import {fonts} from "../theme";
export function OptionPicker({label,options,value,onChange,disabled=false}:{label:string;options:readonly {value:string;label:string}[];value:string;onChange:(value:string)=>void;disabled?:boolean}){const {colors}=useTheme();const [open,setOpen]=useState(false);if(Platform.OS!=="web")return <NativeSelect title={label} options={options} value={value} onChange={onChange} disabled={disabled}/>;return <><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={()=>setOpen(true)} style={{minHeight:52,padding:14,borderRadius:12,backgroundColor:colors.surfaceMuted,flexDirection:"row",alignItems:"center",gap:12}}><Text style={{flex:1,fontFamily:fonts.regular,color:colors.primary}}>{options.find(o=>o.value===value)?.label||"Choose an option"}</Text><Ionicons name="chevron-down" size={18} color={colors.slate500}/></Pressable><SelectionSheet visible={open} title={label} onClose={()=>setOpen(false)}>{options.map(option=><Pressable accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{checked:value===option.value}} key={option.value} onPress={()=>{onChange(option.value);setOpen(false);}} style={{paddingVertical:20,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:"row",gap:12}}><Text style={{flex:1,color:colors.primary,fontFamily:fonts.medium}}>{option.label}</Text>{value===option.value&&<Ionicons name="checkmark" size={20} color={colors.orange}/>}</Pressable>)}</SelectionSheet></>;}
