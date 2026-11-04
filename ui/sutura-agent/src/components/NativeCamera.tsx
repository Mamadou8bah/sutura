import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Linking, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { PrimaryButton } from "./ui";
import { colors } from "../theme";
export default function NativeCamera({ onCode, onManual }: { onCode: (code: string) => void; onManual: () => void }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const [permission, requestPermission] = useCameraPermissions();
  return <View style={{ gap: 12 }}>
    {permission?.granted ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => onCode(data)} /> : <View style={styles.placeholder}>
      <Text style={styles.text}>Allow camera access to scan a customer QR code, or enter the reference below.</Text>
      <PrimaryButton label={permission?.canAskAgain === false ? "Open camera settings" : "Allow camera"} onPress={() => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }} />
    </View>}
    <Pressable accessibilityRole="button" onPress={onManual} style={{ padding: 14 }}><Text style={styles.text}>Enter reference instead</Text></Pressable>
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  camera: { height: 280, borderRadius: 20, overflow: "hidden" },
  placeholder: { minHeight: 220, padding: 24, gap: 20, justifyContent: "center", backgroundColor: colors.surfaceMuted, borderRadius: 20 },
  text: { color: colors.slate700, textAlign: "center", lineHeight: 21 },
});
