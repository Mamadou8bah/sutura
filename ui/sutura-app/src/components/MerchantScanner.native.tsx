import { useIsFocused } from "@react-navigation/native";
import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Linking, View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { PrimaryButton } from "./ui";
export default function MerchantScanner({onCode}:{onCode:(value:string)=>void}) {
 const focused = useIsFocused();
 const {colors}=useTheme();const [permission,requestPermission]=useCameraPermissions();const [error,setError]=useState("");
 if (!focused) return null;
 return <View style={{gap:12}}>{permission?.granted&&!error?<CameraView facing="back" style={{height:280,borderRadius:16,overflow:"hidden"}} barcodeScannerSettings={{barcodeTypes:["qr"]}} onBarcodeScanned={({data})=>onCode(data)} onMountError={()=>setError("Camera unavailable. Check camera access and reopen Scan.")}/>:<View style={{padding:24,gap:16,backgroundColor:colors.surfaceMuted,borderRadius:16}}><Text style={{color:colors.slate500,lineHeight:21}}>{error||"Allow camera access to scan a merchant QR code."}</Text>{!error&&<PrimaryButton label={permission?.canAskAgain===false?"Open camera settings":"Allow camera"} onPress={()=>{if(permission?.canAskAgain===false)void Linking.openSettings();else void requestPermission().catch(()=>setError("Could not access the camera. Check camera access and reopen Scan."));}}/>}</View>}</View>;
}
