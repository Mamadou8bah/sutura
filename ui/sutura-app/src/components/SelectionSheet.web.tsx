import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
export function SelectionSheet({ visible, title, onClose, children }: {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const { colors } = useTheme();
    return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss selection" onPress={onClose} style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background }]}><View style={[styles.handle, { backgroundColor: colors.border }]}/><View style={styles.header}><Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: "700", color: colors.primary }}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color={colors.primary}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView></View></View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", alignItems: "center" }, sheet: { width: "100%", maxWidth: 640, maxHeight: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24 }, handle: { width: 32, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 }, close: { padding: 8 } });
