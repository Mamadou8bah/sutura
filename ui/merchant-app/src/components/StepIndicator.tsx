import { View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import {useTheme} from "../context/ThemeContext";
import {fonts} from "../theme";
import {REGISTRATION_STEPS} from "../constants/registration";
export function StepIndicator({current}:{current:number}){const {colors}=useTheme();return <View style={{gap:10,marginBottom:8}}><Text accessibilityLiveRegion="polite" style={{fontFamily:fonts.regular,color:colors.slate500,fontSize:12}}>Step {current} of {REGISTRATION_STEPS.length}</Text><View style={{flexDirection:"row",gap:6}}>{REGISTRATION_STEPS.map(step=><View key={step.id} style={{flex:1,height:3,borderRadius:2,backgroundColor:step.id<=current?colors.orange:colors.border}}/>)}</View></View>;}
