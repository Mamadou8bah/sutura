import {OptionPicker} from "../../components/OptionPicker";
import {fonts as appFonts} from "../../theme";
import {useTheme,useThemedStyles} from "../../context/ThemeContext";
import type {ThemeColors} from "../../theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../../components/NativeControls";
import { merchantRegistrationApi } from "../../api/merchantRegistration";
import { SuturaLogo, AppInput, Field, LinkButton, PrimaryButton, Screen } from "../../components/ui";
import { StepIndicator } from "../../components/StepIndicator";
import { BUSINESS_CATEGORIES, GAMBIA_REGIONS } from "../../constants/registration";
import { useApp } from "../../context/AppContext";
import { colors, radii } from "../../theme";

export function BusinessScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { reg, updateReg, setScreen, setError, error } = useApp();
  const [loading, setLoading] = useState(false);
  const business = reg.business;

  async function handleSubmit() {
    if(loading)return;
    setError("");
    if(!business.businessName.trim()||!business.cityOrArea.trim()||!business.streetAddress.trim()){setError("Enter your business name, city and street address.");return;}
    setLoading(true);
    try {
      await merchantRegistrationApi.saveBusiness({
        registrationToken: reg.token,
        businessName: business.businessName,
        tradingName: business.tradingName || undefined,
        category: business.category,
        region: business.region,
        cityOrArea: business.cityOrArea,
        streetAddress: business.streetAddress,
        businessRegistrationNumber: business.businessRegistrationNumber || undefined,
      });
      setScreen("reg-owner");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save business");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{marginBottom:24}}><SuturaLogo size={64}/></View>
      <Text style={styles.title}>Business details</Text>
      <StepIndicator current={3} />

      <Field label="Business name">
        <AppInput accessibilityLabel="Business name" maxLength={120} editable={!loading} value={business.businessName} onChangeText={(v) => updateReg({ business: { ...business, businessName: v } })} placeholder="Acme Shop" />
      </Field>
      <Field label="Category">
        <OptionPicker label="Business category" disabled={loading} options={BUSINESS_CATEGORIES} value={business.category} onChange={(v) => updateReg({ business: { ...business, category: v } })} />
      </Field>
      <Field label="Region">
        <OptionPicker label="Business region" disabled={loading} options={GAMBIA_REGIONS} value={business.region} onChange={(v) => updateReg({ business: { ...business, region: v } })} />
      </Field>
      <Field label="City / area">
        <AppInput accessibilityLabel="City or area" maxLength={100} editable={!loading} value={business.cityOrArea} onChangeText={(v) => updateReg({ business: { ...business, cityOrArea: v } })} />
      </Field>
      <Field label="Street address">
        <AppInput accessibilityLabel="Street address" maxLength={200} editable={!loading} value={business.streetAddress} onChangeText={(v) => updateReg({ business: { ...business, streetAddress: v } })} />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={loading ? "Saving…" : "Continue"} onPress={handleSubmit} disabled={loading} />
      <LinkButton label="Back" onPress={() => setScreen("reg-otp")} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {fontFamily: appFonts.bold, fontSize: 34, fontWeight: "700", color: colors.slate900 },
  error: { color: colors.rose800, fontWeight: "600" },
  options: { gap: 8 },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 12, backgroundColor: colors.surface },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.blue100 },
  optionText: {fontFamily: appFonts.medium, fontSize: 14, fontWeight: "600", color: colors.slate700 },
  optionTextActive: { color: colors.primary },
});
