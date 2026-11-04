import { useNativeHeader } from "./NativeControls";
import { Platform } from "react-native";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../theme";
export function BackHeader({ title, onBack }: {
    title: string;
    onBack: () => void;
}) { const { colors } = useTheme(); const nativeHeader = useNativeHeader(title); if (nativeHeader) return null;
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={{ padding: 8 }}><Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} color={colors.primary} size={24}/></Pressable><Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.primary }}>{title}</Text></View>; }
