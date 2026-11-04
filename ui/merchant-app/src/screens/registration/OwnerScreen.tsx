import {OptionPicker} from "../../components/OptionPicker";
import {isNameDraft,isValidName} from "../../utils/inputValidation";
import {fonts as appFonts} from "../../theme";
import {useTheme,useThemedStyles} from "../../context/ThemeContext";
import type {ThemeColors} from "../../theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../../components/NativeControls";
import { merchantRegistrationApi } from "../../api/merchantRegistration";
import { SuturaLogo, AppInput, Field, LinkButton, PrimaryButton, Screen } from "../../components/ui";
import { StepIndicator } from "../../components/StepIndicator";
import { ID_TYPES } from "../../constants/registration";
import { useApp } from "../../context/AppContext";
import { colors, radii } from "../../theme";

export function OwnerScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { reg, updateReg, setScreen, setError, error } = useApp();
  const [loading, setLoading] = useState(false);
  const owner = reg.owner;

  async function handleSubmit() {
    if(loading)return;
    setError("");
    if(!isValidName(owner.firstName.trim())||!isValidName(owner.lastName.trim())){setError("Enter your first and last name using letters.");return;}
    if(!owner.ownerIdNumber.trim()){setError("Enter the number on your identity document.");return;}
    setLoading(true);
    try {
      await merchantRegistrationApi.saveOwner({
        registrationToken: reg.token,
        firstName: owner.firstName,
        lastName: owner.lastName,
        ownerIdType: owner.ownerIdType,
        ownerIdNumber: owner.ownerIdNumber,
      });
      setScreen("reg-account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save owner");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{marginBottom:24}}><SuturaLogo size={64}/></View>
      <Text style={styles.title}>Owner identity</Text>
      <StepIndicator current={4} />

      <Field label="First name">
        <AppInput accessibilityLabel="First name" maxLength={80} editable={!loading} autoCapitalize="words" value={owner.firstName} onChangeText={v=>{if(isNameDraft(v))updateReg({owner:{...owner,firstName:v}});}} />
      </Field>
      <Field label="Last name">
        <AppInput accessibilityLabel="Last name" maxLength={80} editable={!loading} autoCapitalize="words" value={owner.lastName} onChangeText={v=>{if(isNameDraft(v))updateReg({owner:{...owner,lastName:v}});}} />
      </Field>
      <Field label="ID type">
        <OptionPicker label="Identity document type" options={ID_TYPES} value={owner.ownerIdType} onChange={v=>updateReg({owner:{...owner,ownerIdType:v}})} disabled={loading}/>
      </Field>
      <Field label="ID number">
        <AppInput accessibilityLabel="ID number" maxLength={80} editable={!loading} value={owner.ownerIdNumber} onChangeText={(v) => updateReg({ owner: { ...owner, ownerIdNumber: v } })} />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={loading ? "Saving…" : "Continue"} onPress={handleSubmit} disabled={loading} />
      <LinkButton label="Back" onPress={() => setScreen("reg-business")} />
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
