import { Platform } from "react-native";
import { NativeSelect } from "./NativeControls";
import { useState } from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { SelectionSheet } from "./SelectionSheet";
const options: {
    id: ThemePreference;
    label: string;
    hint: string;
}[] = [{ id: "light", label: "Light", hint: "Always use light appearance" }, { id: "dark", label: "Dark", hint: "Always use dark appearance" }, { id: "system", label: "System", hint: "Match your device settings" }];
export function ThemePicker({ compact = false }: {
    compact?: boolean;
}) {
    const { colors, preference, setPreference } = useTheme();
    const [open, setOpen] = useState(false);
    if (Platform.OS !== "web") return <NativeSelect title="Appearance" value={preference}
      options={options.map(option => ({ value: option.id, label: option.label }))}
      onChange={value => setPreference(value as ThemePreference)} />;
    return <><Pressable accessibilityRole="button" accessibilityLabel="Appearance" onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: compact ? 8 : 18, minHeight: 44 }}><Ionicons name="contrast-outline" size={22} color={colors.primary}/>{!compact && <><Text style={{ flex: 1, fontSize: 15, color: colors.primary }}>Mode & appearance</Text><Text style={{ color: colors.slate500 }}>{options.find(o => o.id === preference)?.label}</Text><Ionicons name="chevron-forward" size={16} color={colors.slate500}/></>}</Pressable><SelectionSheet visible={open} title="Mode & appearance" onClose={() => setOpen(false)}><View accessibilityRole="radiogroup" accessibilityLabel="Appearance">{options.map(o => <Pressable key={o.id} accessibilityRole="radio" accessibilityLabel={`${o.label} theme`} accessibilityState={{ checked: preference === o.id }} onPress={() => { setPreference(o.id); setOpen(false); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>{o.label}</Text><Text style={{ fontSize: 12, color: colors.slate500 }}>{o.hint}</Text></View><Ionicons name={preference === o.id ? "checkmark-circle" : "ellipse-outline"} size={23} color={preference === o.id ? colors.orange : colors.slate500}/></Pressable>)}</View></SelectionSheet></>;
}
