import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";

export function LoginMethodPicker({ value, onChange, disabled }: {
  value: "email" | "phone"; onChange: (value: "email" | "phone") => void; disabled: boolean;
}) {
  const { colors } = useTheme();
  return <View accessibilityRole="tablist" accessibilityLabel="Login method"
    style={{ flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.surfaceMuted }}>
    {(["email", "phone"] as const).map(method => <Pressable key={method} accessibilityRole="tab"
      accessibilityLabel={method === "email" ? "Email login" : "Phone login"}
      accessibilityState={{ selected: value === method, disabled }} disabled={disabled}
      onPress={() => onChange(method)} style={{ flex: 1, minHeight: 48, paddingVertical: 10,
        paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: 11,
        backgroundColor: value === method ? colors.surface : "transparent" }}>
      <Text style={{ fontSize: 15, fontWeight: value === method ? "600" : "400",
        textAlign: "center", color: value === method ? colors.primary : colors.slate500 }}>
        {method === "email" ? "Email" : "Phone number"}</Text>
    </Pressable>)}
  </View>;
}
