import {isValidEmail,passwordIssue} from "../../utils/inputValidation";
import {fonts as appFonts} from "../../theme";
import {useTheme,useThemedStyles} from "../../context/ThemeContext";
import type {ThemeColors} from "../../theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../../components/NativeControls";
import { merchantRegistrationApi } from "../../api/merchantRegistration";
import { saveSession } from "../../storage/session";
import { SuturaLogo, PasswordInput, AppInput, Field, LinkButton, PrimaryButton, Screen } from "../../components/ui";
import { StepIndicator } from "../../components/StepIndicator";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme";

export function AccountScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { reg, updateReg, setScreen, setError, error, completeRegistration, refreshSession } = useApp();
  const [loading, setLoading] = useState(false);
  const account = reg.account;

  async function handleSubmit() {
    if(loading)return;
    setError("");
    if(!isValidEmail(account.email.trim())){setError("Enter a valid email address.");return;}
    const issue=passwordIssue(account.password);if(issue){setError(issue);return;}
    if (account.password !== account.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!account.acceptedTerms) {
      setError("Please accept the terms to continue");
      return;
    }

    setLoading(true);
    try {
      const res = await merchantRegistrationApi.complete({
        registrationToken: reg.token,
        email: account.email,
        password: account.password,
        confirmPassword: account.confirmPassword,
        acceptedTerms: account.acceptedTerms,
      });
      await saveSession(res.auth, res.businessName);
      await refreshSession();
      completeRegistration(res.businessName, res.auth.userStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{marginBottom:24}}><SuturaLogo size={64}/></View>
      <Text style={styles.title}>Create login</Text>
      <StepIndicator current={5} />

      <Field label="Email">
        <AppInput accessibilityLabel="Email" inputMode="email" autoComplete="email" autoCorrect={false} maxLength={254} editable={!loading} autoCapitalize="none" keyboardType="email-address" value={account.email} onChangeText={(v) => updateReg({ account: { ...account, email: v.replace(/\s/g, "") } })} />
      </Field>
      <Field label="Password">
        <PasswordInput accessibilityLabel="Password" autoComplete="new-password" autoCapitalize="none" maxLength={72} editable={!loading} secureTextEntry value={account.password} onChangeText={(v) => updateReg({ account: { ...account, password: v } })} />
      </Field>
      <Field label="Confirm password">
        <PasswordInput accessibilityLabel="Confirm password" autoComplete="new-password" autoCapitalize="none" maxLength={72} editable={!loading} secureTextEntry value={account.confirmPassword} onChangeText={(v) => updateReg({ account: { ...account, confirmPassword: v } })} />
      </Field>

      <Pressable accessibilityRole="checkbox" accessibilityLabel="Accept merchant terms" accessibilityState={{checked:account.acceptedTerms}} disabled={loading} onPress={() => updateReg({ account: { ...account, acceptedTerms: !account.acceptedTerms } })} style={styles.termsRow}>
        <Text style={styles.checkbox}>{account.acceptedTerms ? "☑" : "☐"}</Text>
        <Text style={styles.termsText}>I agree to Sutura merchant terms and confirm the information provided is accurate.</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={loading ? "Submitting…" : "Submit application"} onPress={handleSubmit} disabled={loading} />
      <LinkButton label="Back" onPress={() => setScreen("reg-owner")} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {fontFamily: appFonts.bold, fontSize: 34, fontWeight: "700", color: colors.slate900 },
  error: { color: colors.rose800, fontWeight: "600" },
  termsRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkbox: {fontFamily: appFonts.regular, fontSize: 18, color: colors.primary },
  termsText: {fontFamily: appFonts.regular, flex: 1, fontSize: 13, lineHeight: 20, color: colors.slate700 },
});
