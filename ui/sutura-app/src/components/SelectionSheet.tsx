import type { ReactNode } from "react";
import { Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NativeText as Text, NativeButton, NativePressable as Pressable } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
export function SelectionSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  const { colors } = useTheme();
  const ios = Platform.OS === "ios";
  return <Modal visible={visible} transparent={!ios} animationType={ios ? "slide" : "fade"}
    presentationStyle={ios ? "pageSheet" : "overFullScreen"} onRequestClose={onClose}>
    <SafeAreaProvider><SafeAreaView style={[styles.overlay, { backgroundColor: ios ? colors.background : "rgba(0,0,0,.45)" }]}>
      {!ios && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss selection" onPress={onClose} style={StyleSheet.absoluteFill} />}
      <View accessibilityViewIsModal style={[styles.content, ios ? styles.ios : styles.android, { backgroundColor: colors.background }]}>
        <View style={styles.header}><Text accessibilityRole="header" style={{ flex: 1, fontSize: ios ? 20 : 24, fontWeight: "600", color: colors.primary }}>{title}</Text>
          <NativeButton label={ios ? "Done" : "Close"} onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={ios ? "interactive" : "on-drag"}
          contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView>
      </View>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 24, width: "100%" },
  ios: { flex: 1 }, android: { width: "90%", maxWidth: 560, maxHeight: "85%", borderRadius: 28, elevation: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
});
