import { SurfaceBackdrop } from "./SurfaceBackdrop";
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
export function SelectionSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  return <Modal visible={visible} transparent animationType={reduceMotion ? "fade" : "slide"} presentationStyle="overFullScreen" onRequestClose={onClose}>
    <SafeAreaProvider><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss selection" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["bottom", "left", "right"]} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: "transparent", overflow: "hidden" }]}>
        <SurfaceBackdrop />
        <View style={styles.header}><Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "600", color: colors.primary }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={onClose} style={[styles.close, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="close" size={18} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 20 }}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.32)", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "85%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4, paddingBottom: 18 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
