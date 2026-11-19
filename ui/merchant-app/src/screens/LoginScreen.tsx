import { CountryPhoneInput } from "../components/CountryPhoneInput";
import { normalizeCountryPhone as normalizePhone } from "../utils/countryPhone";
import { LoginMethodPicker } from "../components/LoginMethodPicker";
import { VerificationCodeScreen } from "./VerificationCodeScreen";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { PasswordRecoveryScreen } from "./PasswordRecoveryScreen";
import {TwoFactorRequiredError} from "../api/twoFactor";
import {isValidEmail} from "../utils/inputValidation";
import {fonts as appFonts} from "../theme";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { AppInput, PasswordInput, Field, LinkButton, SuturaLogo, PrimaryButton, Screen } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors } from "../theme";

export function LoginScreen() {
 const [recovering,setRecovering]=useState(false);
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { signIn, setScreen, setError, error } = useApp();
  const submitting=useRef(false);
  const [method,setMethod]=useState<"email"|"phone">("email");
  const [phone,setPhone]=useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeId,setChallengeId]=useState("");
  const [verificationCode,setVerificationCode]=useState("");

  useHardwareBack(() => {
    if (loading) return true;
    if (recovering) { setRecovering(false); setError(""); return true; }
    if (challengeId) { setChallengeId(""); setVerificationCode(""); setError(""); return true; }
    return false;
  });
  async function handleSubmit() {
    if(submitting.current)return;
    const username=method==="email"?email.trim():normalizePhone(phone);
    if(method==="email"&&!isValidEmail(email.trim())){setError("Enter a valid email address.");return;}
    if(!username||!password){setError("Enter your phone number and password.");return;}
    if(challengeId&&!/^[0-9]{6}$/.test(verificationCode)){setError("Enter the six-digit verification code.");return;}
    submitting.current=true;
    setError("");
    setLoading(true);
    try {
      await signIn(username, password,challengeId?{challengeId,code:verificationCode}:undefined);
    } catch (err) {
      if(err instanceof TwoFactorRequiredError){setChallengeId(err.challengeId);setVerificationCode("");setError("");return;}
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      submitting.current=false;
      setLoading(false);
    }
  }

  if (challengeId && !recovering) return <VerificationCodeScreen value={verificationCode}
    onChange={setVerificationCode} busy={loading} error={error} onSubmit={() => void handleSubmit()}
    onBack={() => { if (!loading) { setChallengeId(""); setVerificationCode(""); setError(""); } }} />;
  if(recovering) return <PasswordRecoveryScreen onBack={()=>{setRecovering(false);setPassword("");setChallengeId("");setVerificationCode("");setError("");}} />;
  return (
    <Screen>
      <View style={{marginBottom:24}}><SuturaLogo size={64} /></View>
      <Text accessibilityRole="header" style={styles.title}>Log in</Text>
      <Text style={styles.sub}>Sign in to your merchant account</Text>

      <LoginMethodPicker value={method} disabled={loading} onChange={value => { setChallengeId(""); setVerificationCode(""); setMethod(value); setError(""); }} />
      {method==="email"?<Field label="Email"><AppInput accessibilityLabel="Email" inputMode="email" keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={v=>{if(!/\s/.test(v))setEmail(v);}} maxLength={254} editable={!loading} placeholder="name@example.com"/></Field>:<Field label="Phone number"><CountryPhoneInput value={phone} onChangeText={setPhone} disabled={loading} /></Field>}
      <Field label="Password">
        <PasswordInput accessibilityLabel="Password" editable={!loading} autoComplete="current-password" autoCapitalize="none" secureTextEntry value={password} onChangeText={setPassword} placeholder="Your password" />
      </Field>

      <Pressable accessibilityRole="button" disabled={loading} onPress={()=>setRecovering(true)}><Text style={{color:colors.orangeDark,paddingVertical:12}}>Forgot password?</Text></Pressable>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <PrimaryButton loading={loading} label={loading ? "Please wait…" : "Log in"} onPress={handleSubmit} disabled={loading} />
      <LinkButton label="New to Sutura? Create a merchant account" onPress={() => setScreen("reg-phone")} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  title: {fontFamily: appFonts.bold, fontSize: 28, lineHeight: 34, fontWeight: "600", color: colors.slate900 },
  sub: {fontFamily: appFonts.regular, fontSize: 14, color: colors.slate500, marginBottom: 8 },
  error: {fontFamily: appFonts.medium, color: colors.rose800, fontWeight: "600", fontSize: 14 },
});
