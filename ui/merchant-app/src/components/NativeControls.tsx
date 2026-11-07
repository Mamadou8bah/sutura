import { NavigationContext } from "@react-navigation/native";
import { createContext, useContext, useEffect, forwardRef } from "react";
import { ActionSheetIOS, PixelRatio, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type SwitchProps, type TextProps, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { DeviceControl, supportsButtonTint } from "./DeviceControl";
import { Picker } from "@react-native-picker/picker";
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
export type NativeText = Text;
export type NativeInput = TextInput;
export const NativeText = forwardRef<Text, TextProps>((props, ref) => {
  const { colors } = useTheme();
  return <Text {...props} ref={ref} style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style))]} />;
});
export const NativeInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const { colors, mode } = useTheme();
  return <TextInput {...props} ref={ref} keyboardAppearance={props.keyboardAppearance ?? mode}
    selectionColor={props.selectionColor ?? colors.orange} underlineColorAndroid={props.underlineColorAndroid ?? "transparent"}
    style={[{ color: colors.primary }, platformTextStyle(StyleSheet.flatten(props.style))]} />;
});
export const NativePressable = forwardRef<View, PressableProps>((props, ref) => {
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
  const { colors, mode } = useTheme();
  const selected = options.find(option => option.value === value);
  if (Platform.OS === "android" && DeviceControl) return <View>
    <NativeText style={{ color: colors.slate500, fontSize: 12, paddingTop: 8 }}>{title}</NativeText>
    <DeviceControl controlKind="select" label={title} value={value} options={options}
      dark={mode === "dark"} disabled={disabled || !options.some(option => option.enabled !== false)}
      style={{ alignSelf: "stretch", height: Math.max(52, Math.round(24 * PixelRatio.getFontScale() + 24)) }}
      onValueChange={event => {
        const next = event.nativeEvent.value;
        if (!disabled && typeof next === "string" && options.some(option => option.value === next && option.enabled !== false)) onChange(next);
      }} />
  </View>;
  if (Platform.OS === "android") return <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
    <NativeText style={{ color: colors.slate500, fontSize: 12, paddingTop: 8 }}>{title}</NativeText>
    <Picker accessibilityLabel={title} prompt={title} mode="dialog" selectedValue={value} enabled={!disabled}
      dropdownIconColor={colors.primary} style={{ color: colors.primary, minHeight: 48 }}
      onValueChange={next => { if (options.some(option => option.value === next && option.enabled !== false)) onChange(String(next)); }}>
      {options.map(option => <Picker.Item key={option.value} label={option.label} value={option.value}
        enabled={option.enabled !== false} />)}
    </Picker>
  </View>;
  return <NativePressable disabled={disabled || options.length === 0} accessibilityRole="button"
    accessibilityLabel={`${title}, ${selected?.label ?? "Choose"}`} accessibilityState={{ disabled }}
    onPress={() => ActionSheetIOS.showActionSheetWithOptions({ title, options: [...options.map(option => option.label), "Cancel"],
      cancelButtonIndex: options.length, disabledButtonIndices: options.flatMap((option, index) => option.enabled === false ? [index] : []),
      userInterfaceStyle: mode, tintColor: colors.orangeDark }, index => {
        const option = options[index]; if (option && option.enabled !== false) onChange(option.value);
      })} style={{ minHeight: 52, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border, opacity: disabled ? .5 : 1, gap: 5 }}>
    <NativeText style={{ color: colors.slate500, fontSize: 12 }}>{title}</NativeText>
    <NativeText style={{ color: colors.primary, fontSize: 17 }}>{selected?.label ?? "Choose an option"}</NativeText>
  </NativePressable>;
}
