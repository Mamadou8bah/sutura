import { NavigationContext } from "@react-navigation/native";
import { createContext, useContext, useEffect, forwardRef } from "react";
import { ActionSheetIOS, Button, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type TextProps, type TextInputProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
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

export function NativeButton({ label, onPress, disabled = false, color, style }: {
  label: string; onPress: () => void; disabled?: boolean; color?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  if (Platform.OS === "web") return <NativePressable disabled={disabled} accessibilityRole="button"
    accessibilityState={{ disabled }} onPress={onPress} style={[{ minHeight: 52, padding: 12, borderRadius: 8,
      backgroundColor: color ?? colors.orange, justifyContent: "center", alignItems: "center", opacity: disabled ? .5 : 1 }, style]}>
    <NativeText style={{ fontWeight: "700", color: "#181a20", fontSize: 16 }}>{label}</NativeText>
  </NativePressable>;
  return <View style={[{ minHeight: Platform.OS === "android" ? 48 : 44, justifyContent: "center" }, style]}>
    <Button title={label} onPress={onPress} disabled={disabled} accessibilityLabel={label}
      color={color ?? (Platform.OS === "ios" ? colors.orangeDark : colors.orange)} />
  </View>;
}

export type NativeOption = { value: string; label: string; enabled?: boolean };
export function NativeSelect({ title, value, options, onChange, disabled = false }: {
  title: string; value: string; options: readonly NativeOption[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const { colors, mode } = useTheme();
  const selected = options.find(option => option.value === value);
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
