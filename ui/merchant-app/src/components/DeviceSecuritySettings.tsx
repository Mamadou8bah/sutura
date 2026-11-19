import { useState } from "react";
import { View } from "react-native";
import { NativeButton, NativeInput, NativePressable, NativeText as Text } from "./NativeControls";
import { SelectionSheet } from "./SelectionSheet";
import { useDeviceLock } from "../context/DeviceLockContext";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../theme";

type Action = "enable" | "change" | "disable" | "biometric-on" | "biometric-off";
export function DeviceSecuritySettings() {
  const { colors } = useTheme(); const security = useDeviceLock();
  const [action, setAction] = useState<Action | null>(null);
  const [current, setCurrent] = useState(""); const [pin, setPin] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const open = (next: Action) => { setAction(next); setCurrent(""); setPin(""); setConfirmation(""); setError(""); };
  const row = (label: string, description: string, onPress: () => void) => <NativePressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 64, gap: 4, paddingVertical: 12 }}><Text style={{ fontFamily: fonts.medium, color: colors.primary, fontSize: 15 }}>{label}</Text><Text style={{ fontSize: 12, lineHeight: 19, color: colors.slate500 }}>{description}</Text></NativePressable>;
  const field = (label: string, value: string, update: (value: string) => void) => <View style={{ gap: 8 }}><Text style={{ color: colors.slate500, fontSize: 13 }}>{label}</Text><NativeInput accessibilityLabel={label} value={value} onChangeText={v => update(v.replace(/\D/g, "").slice(0, 6))} secureTextEntry inputMode="numeric" keyboardType="number-pad" maxLength={6} autoComplete="off" textContentType="none" editable={!busy} style={{ minHeight: 56, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceMuted, color: colors.primary, fontSize: 20, letterSpacing: 6 }} /></View>;
  async function submit() {
    if (!action || busy) return;
    if ((action === "enable" || action === "change") && pin !== confirmation) { setError("The two PINs do not match."); return; }
    setBusy(true); setError("");
    try { await security.configure(action, current, pin); setAction(null); setCurrent(""); setPin(""); setConfirmation(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update device security."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 4 }}>
    <Text accessibilityRole="header" style={{ color: colors.slate500, fontFamily: fonts.semibold, fontSize: 13, marginTop: 16 }}>App unlock</Text>
    {!security.available ? <Text style={{ color: colors.slate500, fontSize: 13, lineHeight: 21, paddingVertical: 12 }}>App PIN and biometrics are available in the installed Android and iOS apps with secure device storage.</Text> : <>
      {security.enabled ? <>
        {row("Change app PIN", "PIN unlock is on. The app locks after 30 seconds away.", () => open("change"))}
        {row(security.biometric ? "Turn off biometric unlock" : "Enable biometric unlock", security.biometric ? "Fingerprint or Face ID is enabled on this device." : security.biometricSupported ? "Use your enrolled fingerprint or Face ID." : "Set up a supported biometric in your device settings first.", () => open(security.biometric ? "biometric-off" : "biometric-on"))}
        {row("Lock app now", "Keep your session and require a local unlock.", security.lockNow)}
        {row("Turn off app PIN", "Also turns off biometric unlock on this device.", () => open("disable"))}
      </> : row("Set up app PIN", "Use a six-digit PIN to reopen your saved session.", () => open("enable"))}
    </>}
    <SelectionSheet visible={!!action} title={action === "enable" ? "Create your app PIN" : action === "change" ? "Change app PIN" : action === "disable" ? "Turn off app PIN" : "Biometric unlock"} onClose={() => { if (!busy) { setAction(null); setCurrent(""); setPin(""); setConfirmation(""); } }}>
      <View style={{ gap: 16 }}><Text style={{ color: colors.slate500, fontSize: 14, lineHeight: 22 }}>This PIN unlocks this app on this device. It does not replace your account password or approve payments.</Text>
        {action !== "enable" && field("Current app PIN", current, setCurrent)}
        {(action === "enable" || action === "change") && <>{field("New app PIN", pin, setPin)}{field("Confirm app PIN", confirmation, setConfirmation)}</>}
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerFg, lineHeight: 21 }}>{error}</Text>}
        <NativeButton label="Save device security" loading={busy} disabled={busy || (action !== "enable" && current.length !== 6) || ((action === "enable" || action === "change") && (pin.length !== 6 || confirmation.length !== 6))} onPress={() => void submit()} />
      </View>
    </SelectionSheet>
  </View>;
}
