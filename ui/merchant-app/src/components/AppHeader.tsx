import { useNativeHeader } from "./NativeControls";
import { Platform } from "react-native";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { fonts, type } from "../theme";
export function BackHeader({ title, onBack }: {
    title: string;
    onBack: () => void;
}) { const { colors } = useTheme(); const nativeHeader = useNativeHeader(title); if (nativeHeader) return null;
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} color={colors.primary} size={24}/></Pressable><Text accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.headline, color: colors.primary, textAlign: "center" }}>{title}</Text><View style={{ width: 44 }}/></View>; }
