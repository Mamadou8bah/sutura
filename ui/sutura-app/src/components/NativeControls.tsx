import { notifyKeyboardFocus } from "../utils/keyboardLayout";
import { NavigationContext } from "@react-navigation/native";
import { createContext, useContext, useEffect, useState, forwardRef, type ComponentRef } from "react";
import { ActivityIndicator, PixelRatio, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type SwitchProps, type TextProps, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { DeviceControl } from "./DeviceControl";
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
  const family = style?.fontFamily;
  // Preserve icon fonts and explicitly chosen specialist typefaces.
  if (family && !/^(Inter|Poppins)_/.test(family) && !["System", "sans-serif"].includes(family)) return style;
  const requested = style?.fontWeight ?? family?.match(/_(\d{3})/)?.[1] ?? "400";
  const weight = requested === "bold" ? 700 : requested === "normal" ? 400 : Number(requested);
  if (platform === "ios") return { ...style, fontFamily: "Helvetica Neue", fontWeight: weight >= 700 ? "700" : weight >= 600 ? "600" : weight >= 500 ? "500" : "400" };
  const fontFamily = weight >= 700 ? "Inter_700Bold" : weight >= 600 ? "Inter_600SemiBold" : weight >= 500 ? "Inter_500Medium" : "Inter_400Regular";
  return { ...style, fontFamily, fontWeight: "normal" };
}
export type NativeText = ComponentRef<typeof Text>;
export type NativeInput = ComponentRef<typeof TextInput>;
export const NativeText = forwardRef<NativeText, TextProps>((props, ref) => {
  const { colors } = useTheme();
  return <Text {...props} ref={ref} style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style) ?? undefined)]} />;
});
export const NativeInput = forwardRef<NativeInput, TextInputProps>((props, ref) => {
  const { colors, mode } = useTheme();
  return <TextInput {...props} ref={ref} onFocus={event => { notifyKeyboardFocus(); props.onFocus?.(event); }} keyboardAppearance={props.keyboardAppearance ?? mode}
    selectionColor={props.selectionColor ?? colors.orange} underlineColorAndroid={props.underlineColorAndroid ?? "transparent"}
    style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style) ?? undefined)]} />;
});
export const NativePressable = forwardRef<ComponentRef<typeof View>, PressableProps & { quiet?: boolean }>(({ quiet, ...props }, ref) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} ref={ref}
    onFocus={event => {
      const target = event.target as unknown as HTMLElement | null;
      setFocused(!quiet || (Platform.OS === "web" && target?.matches?.(":focus-visible") === true));
      props.onFocus?.(event);
    }}
    onBlur={event => { setFocused(false); props.onBlur?.(event); }}
    style={state => [typeof props.style === "function" ? props.style(state) : props.style,
      !quiet && state.pressed && !props.disabled && { opacity: 0.72 },
      Platform.OS === "web" && focused && { outlineStyle: "solid", outlineWidth: 2, outlineOffset: -2, outlineColor: colors.accentText }]} android_ripple={quiet ? undefined : props.android_ripple ?? { color: colors.border, foreground: true }}
    hitSlop={props.hitSlop ?? 4} />;
});

export function NativeButton({ label, onPress, disabled = false, color, textColor, style, loading = false }: {
  loading?: boolean; label: string; onPress: () => void; disabled?: boolean; color?: string; textColor?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors, mode } = useTheme();
  disabled = disabled || loading;
  const background = color ?? colors.orange;
  const foreground = textColor ?? (background === colors.surface || background === colors.surfaceMuted ? colors.primary : "#181a20");
  const height = Math.max(56, Math.round(24 * PixelRatio.getFontScale() + 20));
  return <NativePressable disabled={disabled} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{ disabled, busy: loading }} onPress={() => { if (!disabled) onPress(); }}
    style={({ pressed }) => [{ minHeight: height, paddingVertical: 12, paddingHorizontal: 16, borderRadius: background === colors.orange ? 999 : 16,
      backgroundColor: background, justifyContent: "center", alignItems: "center", opacity: loading ? 1 : disabled ? .45 : pressed ? .8 : 1 }, style]}>
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", maxWidth: "100%" }}>{loading && <ActivityIndicator size="small" color={foreground}/>}<NativeText style={{ flexShrink: 1, fontWeight: "600", color: foreground, fontSize: 17, textAlign: "center" }}>{label}</NativeText></View>
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
      <NativeText style={{ color: colors.slate500, fontSize: 13 }}>{title}</NativeText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <NativeText style={{ flex: 1, color: colors.primary, fontSize: 15, fontWeight: "600" }}>{selected?.label ?? "Choose an option"}</NativeText>
        <View accessible={false} style={{ width: 9, height: 9, marginTop: -4, marginRight: 4, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.slate500, transform: [{ rotate: "45deg" }] }} />
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
        <View accessible={false} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: option.value === value ? colors.accentText : colors.slate500, alignItems: "center", justifyContent: "center" }}>{option.value === value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentText }} /> : null}</View>
      </NativePressable>)}
    </SelectionSheet>
  </View>;
}
