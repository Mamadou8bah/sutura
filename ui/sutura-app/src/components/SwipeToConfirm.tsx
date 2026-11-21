import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Platform, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable, NativeText } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";

const handleSize = 44;
const trackInset = 4;
const webDragStyle = { touchAction: "none", userSelect: "none" } as ViewStyle;

export function SwipeToConfirm({ label, busy, disabled = false, onConfirm }: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const [offset, setOffset] = useState(0);
  const inactive = busy || disabled;
  const width = useRef(0);
  const confirmation = useRef({ inactive, onConfirm });
  confirmation.current = { inactive, onConfirm };

  const swipe = useMemo(() => {
    const travel = () => Math.max(0, width.current - handleSize - trackInset * 2);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !confirmation.current.inactive && travel() > 0,
      onPanResponderMove: (_, { dx }) => setOffset(Math.min(travel(), Math.max(0, dx))),
      onPanResponderRelease: (_, { dx, dy }) => {
        setOffset(0);
        const distance = travel();
        if (distance > 0 && dx >= distance * 0.85 && dx > Math.abs(dy) && !confirmation.current.inactive) {
          confirmation.current.onConfirm();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => setOffset(0),
    });
  }, []);

  return <View onLayout={event => { width.current = event.nativeEvent.layout.width; }}
    style={{ minHeight: 52, borderRadius: 999, backgroundColor: colors.actionFill, justifyContent: "center",
      paddingHorizontal: 56, paddingVertical: 4, opacity: disabled ? 0.5 : 1 }}>
    <NativePressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint="Drag the handle to the right or activate to confirm."
      accessibilityState={{ busy, disabled: inactive }} disabled={inactive}
      accessibilityActions={Platform.OS === "web" ? undefined : [{ name: "activate" }]}
      onAccessibilityAction={event => { if (!inactive && event.nativeEvent.actionName === "activate") onConfirm(); }}
      onPress={Platform.OS === "web" ? onConfirm : undefined}
      style={{ minHeight: 44, justifyContent: "center" }}>
      <NativeText style={{ color: colors.actionInk, textAlign: "center", fontSize: 14 }}>{busy ? "Processing…" : label}</NativeText>
    </NativePressable>
    <View {...swipe.panHandlers} accessible={false} testID="swipe-confirm-handle"
      style={[{ position: "absolute", left: trackInset + offset, width: handleSize, height: handleSize,
        borderRadius: handleSize / 2, backgroundColor: colors.walletHighlight, justifyContent: "center", alignItems: "center" },
        Platform.OS === "web" && webDragStyle]}>
      {busy ? <ActivityIndicator color={colors.accentText} /> : <Ionicons name="chevron-forward" size={19} color={colors.accentText} />}
    </View>
  </View>;
}
