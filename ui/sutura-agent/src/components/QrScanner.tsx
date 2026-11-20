import { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AppState, Linking, StyleSheet, View, useWindowDimensions } from "react-native";
import { NativeText as Text, NativePressable as Pressable } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "./ui";
import { ScannerChrome } from "./ScannerChrome";

export function QrScanner({onCode,onManual,label}:{onCode:(value:string)=>void;onManual?:()=>void;label:string}) {
  const {colors}=useTheme();const {height,fontScale=1}=useWindowDimensions();
  const [permission,requestPermission]=useCameraPermissions();
  const [requesting,setRequesting]=useState(false);
  const [torch,setTorch]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState("");
  const [foreground,setForeground]=useState(AppState.currentState==="active"),[session,setSession]=useState(0);
  const generation=useRef(0),handled=useRef(false),cameraReady=useRef(false),alive=useRef(true);
  useEffect(()=>{
    alive.current=true;
    const listener=AppState.addEventListener("change",state=>{
      generation.current++;cameraReady.current=false;handled.current=false;
      setTorch(false);setReady(false);setForeground(state==="active");
    });
    return()=>{alive.current=false;generation.current++;cameraReady.current=false;listener.remove();};
  },[]);
  useEffect(()=>{cameraReady.current=false;handled.current=false;setTorch(false);setReady(false);},[permission?.granted]);
  if(!foreground)return null;
  const epoch=generation.current;
  const current=()=>alive.current&&epoch===generation.current&&AppState.currentState==="active";
  const retry=()=>{generation.current++;handled.current=false;cameraReady.current=false;setTorch(false);setReady(false);setError("");setSession(value=>value+1);};
  return <View style={{gap:12}}>
    {permission?.granted&&!error ? <ScannerChrome label={label} height={Math.max(320,Math.min(560,Math.round(height*0.55)+Math.max(0,fontScale-1)*100))} ready={ready} torch={torch}
      onToggle={()=>{if(current()&&cameraReady.current&&!handled.current)setTorch(value=>!value);}}>
      <CameraView key={session} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch&&ready} barcodeScannerSettings={{barcodeTypes:["qr"]}}
        onCameraReady={()=>{if(current()&&!handled.current){cameraReady.current=true;setReady(true);}}}
        onMountError={()=>{if(current()){generation.current++;cameraReady.current=false;setTorch(false);setReady(false);setError("The camera couldn't start. Try again or check camera access in Settings.");}}}
        onBarcodeScanned={({data})=>{if(current()&&cameraReady.current&&!handled.current&&typeof data==="string"&&data.length){handled.current=true;cameraReady.current=false;setTorch(false);setReady(false);onCode(data);}}}/>
    </ScannerChrome> : <View style={{gap:16,padding:20,borderRadius:20,backgroundColor:colors.surfaceMuted}}>
      <Text style={{color:colors.primary,fontWeight:"600",fontSize:18}}>{error?"Camera unavailable":"Camera access"}</Text>
      <Text style={{color:colors.slate500,lineHeight:21}}>{error||"Allow camera access to scan QR codes. Nothing is paid until you review and confirm."}</Text>
      <PrimaryButton loading={requesting} disabled={requesting} label={error?"Try camera again":permission?.canAskAgain===false?"Open camera settings":"Allow camera"} onPress={()=>{
        if(error){retry();return;}
        if(permission?.canAskAgain===false){void Linking.openSettings().catch(()=>setError("Open your phone settings and allow camera access for Sutura."));return;}
        if(requesting)return;
        setRequesting(true);
        void requestPermission().catch(()=>{if(alive.current)setError("Could not request camera access. Check your phone settings.");})
          .finally(()=>{if(alive.current)setRequesting(false);});
      }}/>
    </View>}
    {onManual&&<Pressable accessibilityRole="button" accessibilityLabel="Enter reference or QR code" onPress={onManual} style={{minHeight:48,alignItems:"center",justifyContent:"center"}}><Text style={{color:colors.accentText,fontWeight:"500",fontSize:14}}>Enter reference or QR code</Text></Pressable>}
  </View>;
}
