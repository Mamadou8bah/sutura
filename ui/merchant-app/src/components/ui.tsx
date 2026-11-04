import { NativeButton } from "./NativeControls";
import {fonts as appFonts} from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { KeyboardAvoidingView, Platform, Image, ScrollView, StyleSheet, View, type TextInputProps, type ViewStyle } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "./NativeControls";
import { SUTURA_LOGO } from "../constants/brand";
import { colors, radii, shadow } from "../theme";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

export function Screen({ children }: { children: React.ReactNode }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardDismissMode="on-drag" contentContainerStyle={[styles.screen, { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center" }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView></KeyboardAvoidingView>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  return (
    <Pressable onPress={onPress}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export function SuturaLogo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={SUTURA_LOGO}
      style={{ width: size, height: size, backgroundColor:"#ffffff", borderRadius:8 }}
      accessibilityLabel="Sutura"
      resizeMode="contain"
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 16 },
  field: { gap: 8 },
  fieldLabel: {fontFamily: appFonts.bold, fontSize: 12, fontWeight: "700", color: colors.slate500,  letterSpacing: 0.6 },
  fieldHint: {fontFamily: appFonts.regular, fontSize: 12, color: colors.slate500 },
  input: {fontFamily: appFonts.regular,
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
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
  primaryButtonText: {fontFamily: appFonts.bold, fontSize: 16, fontWeight: "800", color: colors.white },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: {fontFamily: appFonts.medium, textAlign: "left", color: colors.orangeDark, fontWeight: "500", fontSize: 14, paddingVertical:12 },
});

export function PasswordInput(props:TextInputProps){
 const {colors}=useTheme();const [visible,setVisible]=useState(false);
 return <View style={{position:"relative"}}><AppInput {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={[props.style,{paddingRight:52}]}/><Pressable accessibilityRole="button" accessibilityLabel={visible?"Hide password":"Show password"} onPress={()=>setVisible(!visible)} style={{position:"absolute",right:4,top:4,width:44,height:44,alignItems:"center",justifyContent:"center"}}><Ionicons name={visible?"eye-outline":"eye-off-outline"} size={20} color={colors.slate500}/></Pressable></View>;
}
