import { NativeButton } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputProps, type ViewStyle } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "./NativeControls";
import { colors, fonts, radii, shadow } from "../theme";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function AppInput(props: TextInputProps) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const [focused,setFocused]=useState(false);
  return <TextInput {...props} selectionColor={colors.orange} onFocus={event=>{setFocused(true);props.onFocus?.(event);}} onBlur={event=>{setFocused(false);props.onBlur?.(event);}} placeholderTextColor={props.placeholderTextColor ?? colors.slate500} style={[styles.input, focused && {borderColor:colors.orange}, props.style]} />;
}

export function PrimaryButton({ label, onPress, disabled = false, color, style }: {
  label: string; onPress: () => void; disabled?: boolean; color?: string; textColor?: string; style?: ViewStyle;
}) {
  return <NativeButton label={label} onPress={onPress} disabled={disabled} color={color} style={style} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return <View style={[styles.card, style]}>{children}</View>;
}

export function FormError({ message }: { message?: string | null }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.slate700 },
  fieldHint: { fontSize: 12, fontFamily: fonts.regular, color: colors.slate500 },
  input: {
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.slate900,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: 16, fontFamily: fonts.bold, color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { fontSize: 13, fontFamily: fonts.medium, color: colors.rose800, textAlign: "center" },
});

export function Screen({ children }: { children: React.ReactNode }) {
 const {colors}=useTheme();

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", padding: 24, paddingBottom: 40, gap: 16 }}>{children}</ScrollView></KeyboardAvoidingView>;
}

export function PasswordInput(props:TextInputProps){
 const {colors}=useTheme();const [visible,setVisible]=useState(false);
 return <View style={{position:"relative"}}><AppInput {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={[props.style,{paddingRight:52}]}/><Pressable accessibilityRole="button" accessibilityLabel={visible?"Hide password":"Show password"} onPress={()=>setVisible(!visible)} style={{position:"absolute",right:4,top:4,width:44,height:44,alignItems:"center",justifyContent:"center"}}><Ionicons name={visible?"eye-outline":"eye-off-outline"} size={20} color={colors.slate500}/></Pressable></View>;
}
