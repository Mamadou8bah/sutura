import { NavigationContext } from "@react-navigation/native";
import { createContext, useContext, useEffect, useState, forwardRef, type ComponentRef } from "react";
import { PixelRatio, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type SwitchProps, type TextProps, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { DeviceControl, supportsButtonTint } from "./DeviceControl";
import { SelectionSheet } from "./SelectionSheet";
import { useTheme } from "../context/ThemeContext";

export const NativeHeaderContext = createContext(false);
export function useNativeHeader(title: string) {
  const active = useContext(NativeHeaderContext);
  const navigation = useContext(NavigationContext);
  useEffect(() => { if (active) navigation?.setOptions({ title }); }, [active, navigation, title]);
  return active;
}

export function platformTextStyle(style: TextStyle | undefined, platform = Platform.OS): TextStyle | undefined {
  if (platform === "web") return style;
  const family = style?.fontFamily;
  if (family && !family.startsWith("Inter_")) return style;
  const weight = family?.match(/Inter_(\d{3})/)?.[1] as TextStyle["fontWeight"];
  return { ...style, fontFamily: platform === "ios" ? "System" : "sans-serif",
    fontWeight: style?.fontWeight ?? weight ?? "400" };
}
export type NativeText = ComponentRef<typeof Text>;
export type NativeInput = ComponentRef<typeof TextInput>;
export const NativeText = forwardRef<NativeText, TextProps>((props, ref) => {
  const { colors } = useTheme();
  return <Text {...props} ref={ref} style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style) ?? undefined)]} />;
});
export const NativeInput = forwardRef<NativeInput, TextInputProps>((props, ref) => {
  const { colors, mode } = useTheme();
  return <TextInput {...props} ref={ref} keyboardAppearance={props.keyboardAppearance ?? mode}
    selectionColor={props.selectionColor ?? colors.orange} underlineColorAndroid={props.underlineColorAndroid ?? "transparent"}
    style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style) ?? undefined)]} />;
});
export const NativePressable = forwardRef<ComponentRef<typeof View>, PressableProps>((props, ref) => {
  const { colors } = useTheme();
  return <Pressable {...props} ref={ref} android_ripple={props.android_ripple ?? { color: colors.border, foreground: true }}
    hitSlop={props.hitSlop ?? 4} />;
});

export function NativeButton({ label, onPress, disabled = false, color, textColor, style }: {
  label: string; onPress: () => void; disabled?: boolean; color?: string; textColor?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors, mode } = useTheme();
  const background = color ?? colors.orange;
  const foreground = textColor ?? (background === colors.surface || background === colors.surfaceMuted ? colors.primary : "#181a20");
  const height = Math.max(48, Math.round(24 * PixelRatio.getFontScale() + 20));
  if (DeviceControl && supportsButtonTint) return <View style={[{ minWidth: 112, minHeight: height }, style]}>
    <DeviceControl controlKind="button" label={label} dark={mode === "dark"} disabled={disabled}
      buttonColor={background} textColor={foreground} onAction={() => { if (!disabled) onPress(); }}
      style={{ alignSelf: "stretch", height }} />
  </View>;
  return <NativePressable disabled={disabled} accessibilityRole="button"
    accessibilityState={{ disabled }} onPress={() => { if (!disabled) onPress(); }}
    style={({ pressed }) => [{ minHeight: height, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
      backgroundColor: background, justifyContent: "center", alignItems: "center", opacity: disabled ? .45 : pressed ? .8 : 1 }, style]}>
    <NativeText style={{ fontWeight: "700", color: foreground, fontSize: 16, textAlign: "center" }}>{label}</NativeText>
  </NativePressable>;
}

export type NativeOption = { value: string; label: string; enabled?: boolean };
export function NativeSwitch(props: SwitchProps) {
  const { mode } = useTheme();
  if (!DeviceControl) return <Switch {...props} />;
  return <DeviceControl controlKind="switch" label={props.accessibilityLabel ?? "Toggle"}
    dark={mode === "dark"} checked={Boolean(props.value)} disabled={props.disabled}
    testID={props.testID} style={[{ width: 72, height: 48 }, props.style]}
    onValueChange={event => {
      const checked = event.nativeEvent.checked;
      if (!props.disabled && typeof checked === "boolean") props.onValueChange?.(checked);
    }} />;
}

export function NativeSelect({ title, value, options, onChange, disabled = false }: {
  title: string; value: string; options: readonly NativeOption[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const selected = options.find(option => option.value === value);
  const unavailable = disabled || !options.some(option => option.enabled !== false);
  return <View>
    <NativePressable disabled={unavailable} accessibilityRole="button" accessibilityLabel={`${title}, ${selected?.label ?? "Choose"}`}
      accessibilityState={{ disabled: unavailable, expanded: open }} onPress={() => { if (!unavailable) setOpen(true); }}
      style={{ minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, backgroundColor: colors.surfaceMuted, opacity: unavailable ? .5 : 1, gap: 4 }}>
      <NativeText style={{ color: colors.slate500, fontSize: 12 }}>{title}</NativeText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <NativeText style={{ flex: 1, color: colors.primary, fontSize: 15, fontWeight: "600" }}>{selected?.label ?? "Choose an option"}</NativeText>
        <NativeText style={{ color: colors.slate500 }}>⌄</NativeText>
      </View>
    </NativePressable>
    <SelectionSheet visible={open && !unavailable} title={title} onClose={() => setOpen(false)}>
      {options.map(option => <NativePressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ checked: option.value === value, disabled: option.enabled === false || disabled }}
        disabled={option.enabled === false || disabled} onPress={() => {
          if (disabled || option.enabled === false) return;
          onChange(option.value); setOpen(false);
        }} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, opacity: option.enabled === false ? .4 : 1 }}>
        <NativeText style={{ flex: 1, color: colors.primary, fontSize: 15 }}>{option.label}</NativeText>
        <NativeText style={{ color: option.value === value ? colors.orange : colors.slate500, fontSize: 20 }}>{option.value === value ? "●" : "○"}</NativeText>
      </NativePressable>)}
    </SelectionSheet>
  </View>;
}
