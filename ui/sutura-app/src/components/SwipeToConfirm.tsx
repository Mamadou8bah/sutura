import { useState } from "react";
import { ActivityIndicator, PanResponder, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable, NativeText } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";

export function SwipeToConfirm({ label, busy, disabled = false, onConfirm }: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const inactive = busy || disabled;
  const travel = Math.max(0, width - 54);
  const swipe = PanResponder.create({
    onStartShouldSetPanResponder: () => !inactive && travel > 0,
    onPanResponderMove: (_, { dx }) => setOffset(Math.min(travel, Math.max(0, dx))),
    onPanResponderRelease: (_, { dx }) => {
      setOffset(0);
      if (!inactive && dx >= travel * 0.85) onConfirm();
    },
    onPanResponderTerminate: () => setOffset(0),
  });

  return <NativePressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint={Platform.OS === "web" ? undefined : "Swipe right from the handle, or activate to confirm."}
    accessibilityState={{ busy, disabled: inactive }} disabled={inactive}
    accessibilityActions={[{ name: "activate" }]}
    onAccessibilityAction={event => { if (!inactive && event.nativeEvent.actionName === "activate") onConfirm(); }}
    onPress={Platform.OS === "web" ? onConfirm : undefined}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ minHeight: 52, borderRadius: 999, backgroundColor: colors.actionFill, justifyContent: "center", paddingHorizontal: 56, paddingVertical: 12, opacity: disabled ? 0.5 : 1 }}>
    <NativeText style={{ color: colors.actionInk, textAlign: "center", fontSize: 14 }}>{busy ? "Processing…" : label}</NativeText>
    <View {...(Platform.OS === "web" ? {} : swipe.panHandlers)} accessible={false}
      style={{ position: "absolute", left: 4 + offset, width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.walletHighlight, justifyContent: "center", alignItems: "center" }}>
      {busy ? <ActivityIndicator color={colors.accentText} /> : <Ionicons name="chevron-forward" size={19} color={colors.accentText} />}
    </View>
  </NativePressable>;
}
