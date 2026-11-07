import type { ReactNode } from "react";
import { Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
export function SelectionSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  const { colors } = useTheme();
  return <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
    <SafeAreaProvider><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss selection" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["bottom", "left", "right"]} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}><Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: "700", color: colors.primary }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 20 }}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.42)", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
