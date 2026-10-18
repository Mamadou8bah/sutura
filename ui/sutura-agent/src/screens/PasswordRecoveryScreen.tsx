import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AppInput, Field, PrimaryButton, Screen } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../theme";
import { normalizePhone, isPhoneDraft } from "../utils/inputValidation";
import { requestPasswordRecovery, confirmPasswordRecovery } from "../api/passwordRecovery";

export function PasswordRecoveryScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    const identifier = normalizePhone(phone);
    if (!identifier) { setError("Enter your registered phone number, including its country code."); return; }
    if (requestId && (!/^[0-9]{6}$/.test(code) || password.length < 12 || password !== confirmation)) {
      setError("Enter the six-digit code and matching passwords with at least 12 characters."); return;
    }
    submitting.current = true; setBusy(true); setError("");
    try {
      if (!requestId) setRequestId((await requestPasswordRecovery(identifier)).requestId);
      else { await confirmPasswordRecovery(requestId, code, password); setPassword(""); setConfirmation(""); setCode(""); setDone(true); }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not reach the server. Please try again later."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Screen>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onBack}><Text style={{ color: colors.orangeDark, paddingVertical: 12 }}>Back to sign in</Text></Pressable>
    <Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.primary }}>{done ? "Password changed" : "Reset your password"}</Text>
    {done ? <><Text style={{ color: colors.slate500 }}>Your previous sessions have been signed out. Sign in with your new password.</Text><PrimaryButton label="Back to sign in" onPress={onBack} /></> : <>
      <Text style={{ color: colors.slate500 }}>Use the verified phone number on your account. Recovery needs a connection to Sutura.</Text>
      {!requestId ? <Field label="Phone number"><AppInput accessibilityLabel="Recovery phone number" value={phone} onChangeText={v => { if (isPhoneDraft(v)) setPhone(v); }} inputMode="tel" keyboardType="phone-pad" autoComplete="tel" maxLength={40} editable={!busy} placeholder="+220 700 0001" /></Field> : <>
        <Text style={{ color: colors.slate500 }}>If your account is eligible, a code was sent by SMS. It expires in ten minutes.</Text>
        <Field label="Recovery code"><AppInput accessibilityLabel="Recovery code" value={code} onChangeText={v => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))} inputMode="numeric" keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} editable={!busy} /></Field>
        <Field label="New password"><AppInput accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={72} editable={!busy} placeholder="At least 12 characters" /></Field>
        <Field label="Confirm password"><AppInput accessibilityLabel="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={72} editable={!busy} /></Field>
      </>}
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800 }}>{error}</Text>}
      <PrimaryButton label={busy ? "Please wait..." : requestId ? "Reset password" : "Send recovery code"} disabled={busy} onPress={() => void submit()} />
      {!!requestId && <Pressable disabled={busy} onPress={() => { setRequestId(""); setCode(""); setError(""); }}><Text style={{ color: colors.orangeDark, paddingVertical: 12 }}>Use another number or request a new code</Text></Pressable>}
    </>}
  </Screen>;
}
