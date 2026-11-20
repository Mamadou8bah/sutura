import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Familiar camera controls, kept outside CameraView for Android compatibility. */
export function ScannerChrome({ children, height, ready, torch, onToggle, label }: {
  children: ReactNode; height: number; ready: boolean; torch: boolean; onToggle: () => void; label: string;
}) {
  const {fontScale=1}=useWindowDimensions();
  const largeText=fontScale>1.3;
  const targetSize=Math.min(210,Math.max(150,height-190));
  return <View style={[styles.frame, {height}]}>
    {children}
    <View pointerEvents="none" style={styles.guide}>
      <View style={[styles.shade,{minHeight:largeText?70:50}]}/>
      <View style={[styles.middle,{height:targetSize}]}><View style={styles.shade}/><View style={[styles.target,{width:targetSize}]}>
        <View style={[styles.corner, styles.tl]}/><View style={[styles.corner, styles.tr]}/>
        <View style={[styles.corner, styles.bl]}/><View style={[styles.corner, styles.br]}/>
      </View><View style={styles.shade}/></View>
      <View style={[styles.shade,{flex:1.6,minHeight:largeText?120:100}]}/>
    </View>
    <View pointerEvents="none" style={styles.caption}><Text style={styles.captionText}>{largeText?"Align QR code":label}</Text></View>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={torch ? "Turn off flashlight" : "Turn on flashlight"}
        accessibilityHint="Lights up the QR code" accessibilityState={{selected:torch,disabled:!ready}}
        disabled={!ready} onPress={onToggle} android_ripple={{color:torch?"#d4d4d8":"#52525b",borderless:true}}
        style={({pressed})=>[styles.light,torch&&styles.lightOn,!ready&&styles.disabled,pressed&&styles.pressed]}>
        <Ionicons name={torch?"flash":"flash-outline"} size={25} color={torch?"#111111":"#ffffff"}/>
      </Pressable>
      <Text style={styles.controlLabel}>{torch ? "Flashlight on" : "Flashlight"}</Text>
    </View>
  </View>;
}
const styles=StyleSheet.create({
  frame:{backgroundColor:"#09090b",borderRadius:24,overflow:"hidden",position:"relative",width:"100%"},
  guide:{position:"absolute",top:0,right:0,bottom:0,left:0},shade:{flex:1,backgroundColor:"rgba(0,0,0,0.42)"},
  middle:{flexDirection:"row",height:210},target:{width:210,position:"relative"},
  corner:{position:"absolute",height:28,width:28,borderColor:"#ffffff"},
  tl:{left:0,top:0,borderLeftWidth:3,borderTopWidth:3,borderTopLeftRadius:12},
  tr:{right:0,top:0,borderRightWidth:3,borderTopWidth:3,borderTopRightRadius:12},
  bl:{left:0,bottom:0,borderLeftWidth:3,borderBottomWidth:3,borderBottomLeftRadius:12},
  br:{right:0,bottom:0,borderRightWidth:3,borderBottomWidth:3,borderBottomRightRadius:12},
  caption:{position:"absolute",left:20,right:20,top:20,alignItems:"center"},
  captionText:{color:"#ffffff",fontSize:14,lineHeight:20,textAlign:"center",fontWeight:"500"},
  controls:{position:"absolute",left:0,right:0,bottom:18,alignItems:"center",gap:6},
  light:{width:54,height:54,borderRadius:27,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(24,24,27,0.92)",borderWidth:1,borderColor:"#71717a"},
  lightOn:{backgroundColor:"#ffffff",borderColor:"#ffffff"},controlLabel:{color:"#ffffff",fontSize:12,fontWeight:"500"},
  disabled:{opacity:0.45},pressed:{opacity:0.75},
});
