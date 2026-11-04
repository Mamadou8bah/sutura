import {fonts as appFonts} from "../../theme";
import {useTheme,useThemedStyles} from "../../context/ThemeContext";
import type {ThemeColors} from "../../theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeText as Text } from "../../components/NativeControls";
import { merchantRegistrationApi } from "../../api/merchantRegistration";
import { SuturaLogo, AppInput, Field, LinkButton, PrimaryButton, Screen } from "../../components/ui";
import { StepIndicator } from "../../components/StepIndicator";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme";

export function OtpScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { reg, updateReg, setScreen, setError, error } = useApp();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if(loading)return;
    setError("");
    setLoading(true);
    try {
      await merchantRegistrationApi.verifyPhone(reg.token, reg.otp);
      setScreen("reg-business");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{marginBottom:24}}><SuturaLogo size={64}/></View>
      <Text style={styles.title}>Enter verification code</Text>
      <StepIndicator current={2} />

      <Field label="6-digit code">
        <AppInput keyboardType="number-pad" maxLength={6} value={reg.otp} onChangeText={(v) => updateReg({ otp: v.replace(/\D/g, "").slice(0, 6) })} placeholder="123456" />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={loading ? "Verifying…" : "Continue"} onPress={handleSubmit} disabled={loading || reg.otp.length !== 6} />
      <LinkButton label="Back" onPress={() => setScreen("reg-phone")} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {fontFamily: appFonts.bold, fontSize: 34, fontWeight: "700", color: colors.slate900 },
  error: { color: colors.rose800, fontWeight: "600" },
});
