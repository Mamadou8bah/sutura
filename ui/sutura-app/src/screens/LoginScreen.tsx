import { useHardwareBack } from "../hooks/useBackNavigation";
import { PasswordRecoveryScreen } from "./PasswordRecoveryScreen";
import {TwoFactorRequiredError} from "../api/twoFactor";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, Keyboard, View } from "react-native";
import { SuturaLogo } from "../components/SuturaLogo";
import { AppInput, Field, PrimaryButton, Screen } from "../components/ui";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fonts, type ThemeColors } from "../theme";
import { isNameDraft, isValidName, isPhoneDraft, normalizePhone, isValidEmail, passwordIssue } from "../utils/inputValidation";
export function LoginScreen() {
 const [recovering,setRecovering]=useState(false);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { signIn, signUp } = useAuth();
    const [registering, setRegistering] = useState(false);
    const [step, setStep] = useState(0);
    const stages = ["Your name", "Contact details", "Create a password"];
    const [method, setMethod] = useState<"email" | "phone">("email");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [error, setError] = useState("");
  const [challengeId,setChallengeId]=useState("");
  const [verificationCode,setVerificationCode]=useState("");
    const [loading, setLoading] = useState(false);
    const submitting = useRef(false);
    useHardwareBack(() => {
      if (loading) return true;
      if (recovering) { setRecovering(false); setError(""); return true; }
      if (challengeId) { setChallengeId(""); setVerificationCode(""); setError(""); return true; }
      if (registering && step > 0) { setStep(step - 1); setError(""); return true; }
      if (registering) { setRegistering(false); setError(""); return true; }
      return false;
    });
    function nextStep() {
        setError("");
        if (step === 0 && (!isValidName(firstName.trim()) || !isValidName(lastName.trim()))) {
            setError("Enter your first and last name using letters."); return;
        }
        if (step === 1) {
            if (!normalizePhone(phone)) { setError("Enter a valid phone number, including its country code."); return; }
            if (email.trim() && !isValidEmail(email.trim())) { setError("Enter a valid email address."); return; }
        }
        Keyboard.dismiss();
        setStep(value => Math.min(value + 1, 2));
    }
    async function handleLogin() {
        if (submitting.current)
            return;
        if (registering && step < 2) { nextStep(); return; }
        setError("");
        if (registering && (!isValidName(firstName.trim()) || !isValidName(lastName.trim()))) {
            setError("Enter your first and last name using letters.");
            return;
        }
        const normalizedPhone = normalizePhone(phone);
        if ((registering || method === "phone") && !normalizedPhone) {
            setError("Enter a valid phone number, including its country code.");
            return;
        }
        if ((registering ? !!email.trim() : method === "email") && !isValidEmail(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }
        const issue = registering ? passwordIssue(password) : !password ? "Enter your password." : null;
        if (issue) {
            setError(issue);
            return;
        }
        if(challengeId&&!/^[0-9]{6}$/.test(verificationCode)){setError("Enter the six-digit verification code.");return;}
        submitting.current = true;
        setLoading(true);
        try {
            if (registering)
                await signUp({ firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: normalizedPhone!, email: email.trim() || undefined, password });
            else
                await signIn(method === "email" ? email.trim() : phone.trim().replace(/[\s().-]/g, ""), password,challengeId?{challengeId,code:verificationCode}:undefined);
        }
        catch (err) {
            if(err instanceof TwoFactorRequiredError){setChallengeId(err.challengeId);setVerificationCode("");if(registering){setRegistering(false);setMethod("phone");} }
            setError(err instanceof Error ? err.message : "Login failed");
        }
        finally {
            submitting.current = false;
            setLoading(false);
        }
    }
  if(recovering) return <PasswordRecoveryScreen onBack={()=>{setRecovering(false);setPassword("");setChallengeId("");setVerificationCode("");setError("");}} />;
    return <Screen>
    <View style={styles.brandBar}><SuturaLogo size={64}/>{registering && step > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Previous step" disabled={loading} onPress={() => { Keyboard.dismiss(); setStep(value => value - 1); setError(""); }} style={{padding:12}}><Ionicons name="arrow-back" size={24} color={colors.primary}/></Pressable>}</View>
    {registering && <View style={{gap:10}}><Text accessibilityLiveRegion="polite" style={{color:colors.slate500,fontSize:12}}>Step {step + 1} of 3</Text><View style={{flexDirection:"row",gap:6}}>{stages.map((stage,index)=><View key={stage} style={{flex:1,height:3,borderRadius:2,backgroundColor:index<=step?colors.orange:colors.border}}/>)}</View></View>}
    <Text style={styles.title}>{registering ? stages[step] : "Log in"}</Text>
    <Text style={styles.subtitle}>{registering ? ["Let’s start with your first and last name.", "Use your phone number to receive money. Email is optional.", "Choose a password with at least 8 characters."][step] : "Log in to your Sutura account."}</Text>
    {!registering && <View accessibilityRole="tablist" style={styles.tabs}>{(["email", "phone"] as const).map(value => <Pressable accessibilityRole="tab" accessibilityLabel={value === "email" ? "Email login" : "Phone login"} accessibilityState={{ selected: method === value }} key={value} disabled={loading} onPress={() => { setChallengeId("");setVerificationCode("");setMethod(value); setError(""); }} style={[styles.tab, method === value && styles.activeTab]}><Text style={[styles.tabText, method === value && { color: colors.primary }]}>{value === "email" ? "Email" : "Phone number"}</Text></Pressable>)}</View>}
    {registering && step === 0 && <>
      <Field label="First name"><AppInput accessibilityLabel="First name" value={firstName} onChangeText={value => { if (isNameDraft(value))
            setFirstName(value); }} maxLength={80} autoComplete="given-name" autoCapitalize="words" editable={!loading} placeholder="First name"/></Field>
      <Field label="Last name"><AppInput accessibilityLabel="Last name" value={lastName} onChangeText={value => { if (isNameDraft(value))
            setLastName(value); }} maxLength={80} autoComplete="family-name" autoCapitalize="words" editable={!loading} placeholder="Last name"/></Field>
    </>}
    {(registering ? step === 1 : method === "phone") && <Field label="Phone number"><AppInput accessibilityLabel="Phone number" value={phone} onChangeText={value => { if (isPhoneDraft(value))
        setPhone(value); }} inputMode="tel" keyboardType="phone-pad" autoComplete="tel" maxLength={40} editable={!loading} placeholder="+220 700 0001"/></Field>}
    {(registering ? step === 1 : method === "email") && <Field label={registering ? "Email (optional)" : "Email"}><AppInput accessibilityLabel="Email" value={email} onChangeText={value => { if (!/\s/.test(value))
        setEmail(value); }} keyboardType="email-address" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect={false} maxLength={254} editable={!loading} placeholder="name@example.com"/></Field>}
    {(!registering || step === 2) && <Field label="Password"><View style={{ position: "relative" }}><AppInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} style={{ paddingRight: 52 }} autoCapitalize="none" autoCorrect={false} autoComplete={registering ? "new-password" : "current-password"} maxLength={registering ? 72 : 256} editable={!loading} placeholder={registering ? "At least 8 characters" : "Enter your password"} onSubmitEditing={() => void handleLogin()} returnKeyType="go"/><Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} onPress={() => setPasswordVisible(!passwordVisible)} style={{ position: "absolute", right: 4, top: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name={passwordVisible ? "eye-outline" : "eye-off-outline"} size={20} color={colors.slate500}/></Pressable></View></Field>}
    {challengeId&&<Field label="Verification code"><AppInput accessibilityLabel="Verification code" value={verificationCode} onChangeText={v=>setVerificationCode(v.replace(/[^0-9]/g,"").slice(0,6))} keyboardType="number-pad" inputMode="numeric" autoComplete="sms-otp" maxLength={6} placeholder="6-digit code" editable={!loading}/><Text style={{color:colors.slate500}}>Check your SMS or email. The code expires in five minutes.</Text><Pressable onPress={()=>{setChallengeId("");setVerificationCode("");setError("");}}><Text style={styles.link}>Start sign-in again</Text></Pressable></Field>}
    {!registering && <Pressable accessibilityRole="button" disabled={loading} onPress={()=>setRecovering(true)}><Text style={{color:colors.orangeDark,paddingVertical:12}}>Forgot password?</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {loading && <ActivityIndicator color={colors.orange} accessibilityLabel="Signing in"/>}
    <PrimaryButton label={loading ? "Please wait..." : registering ? step < 2 ? "Continue" : "Create account" : "Log in"} disabled={loading} onPress={() => void handleLogin()}/>
    <Pressable accessibilityRole="button" disabled={loading} onPress={() => { setChallengeId("");setVerificationCode("");setRegistering(!registering); setStep(0); setPassword(""); setPasswordVisible(false); setError(""); }}><Text style={styles.link}>{registering ? "Already have an account? Log in" : "New to Sutura? Create an account"}</Text></Pressable>

  </Screen>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ brandBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }, title: { fontFamily: fonts.bold, fontSize: 34, color: colors.primary }, subtitle: { fontFamily: fonts.regular, color: colors.slate500, fontSize: 14, lineHeight: 21, marginBottom: 8 }, tabs: { flexDirection: "row", gap: 24, borderBottomWidth: 1, borderBottomColor: colors.border }, tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" }, activeTab: { borderBottomColor: colors.orange }, tabText: { fontFamily: fonts.bold, fontSize: 15, color: colors.slate500 }, error: { color: colors.rose800, fontSize: 13, lineHeight: 20 }, link: { fontFamily: fonts.medium, color: colors.orangeDark, fontSize: 14, paddingVertical: 12, textAlign: "left" }, appearanceLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.slate500, marginTop: 16 } });
