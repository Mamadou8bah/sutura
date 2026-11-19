import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeButton, NativeInput, NativePressable, NativeText as Text } from "../components/NativeControls";
import { useTheme } from "./ThemeContext";
import { nativeVaultAvailable } from "../storage/deviceVault";
import { biometricAvailable, changePin, createPin, readLock, removePin, setBiometric, verifyBiometric, verifyPin, type LockRecord } from "../storage/localSecurity";
import { setDeviceUnlocked } from "../storage/deviceAccess";
import { fonts } from "../theme";

type DeviceLock = {
  unlocked: boolean; available: boolean; enabled: boolean; biometric: boolean; biometricSupported: boolean;
  configure: (action: "enable" | "change" | "disable" | "biometric-on" | "biometric-off", pin: string, nextPin?: string) => Promise<void>;
  lockNow: () => void;
};
const Context = createContext<DeviceLock | null>(null);
export function useDeviceLock() { const value = useContext(Context); if (!value) throw new Error("DeviceLockProvider required"); return value; }

export function DeviceLockProvider({ scope, onSignOut, children }: { scope: string | null; onSignOut: () => Promise<void>; children: ReactNode }) {
  const { colors } = useTheme();
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [record, setRecord] = useState<LockRecord | null>(null);
  const [locked, setLocked] = useState(true);
  const [privacy, setPrivacy] = useState(AppState.currentState !== "active");
  const [mountedScope, setMountedScope] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [failure, setFailure] = useState("");
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const authenticationPrompt = useRef(false);
  const enabledRef = useRef(false); enabledRef.current = !!record;
  const check = useCallback(async () => {
    const owner = scope; if (!owner) { setReadyScope(null); return; }
    setFailure(""); setReadyScope(null);
    try {
      const supported = await nativeVaultAvailable();
      if (Platform.OS !== "web" && !supported) throw new Error("Secure device storage is unavailable.");
      const saved = supported ? await readLock(owner) : null;
      if (scopeRef.current !== owner) return;
      setAvailable(supported); setRecord(saved); setLocked(!!saved); setPin("");
      setBiometricSupported(supported && await biometricAvailable().catch(() => false));
      setReadyScope(owner);
    } catch { if (scopeRef.current === owner) setFailure("Your device unlock settings could not be loaded. Try again, or sign in with your password."); }
  }, [scope]);
  useEffect(() => { setMountedScope(null); void check(); }, [check]);
  useEffect(() => {
    if (scope && readyScope === scope && !locked && !failure) setMountedScope(scope);
    setDeviceUnlocked(!scope || (readyScope === scope && !locked && !privacy && !failure));
  }, [scope, readyScope, locked, privacy, failure]);
  useEffect(() => {
    let awayAt: number | null = null;
    const listener = AppState.addEventListener("change", state => {
      if (state !== "active") {
        if (!authenticationPrompt.current && awayAt === null) awayAt = Date.now();
        setPrivacy(true);
      } else {
        if (!authenticationPrompt.current && enabledRef.current && awayAt !== null && Date.now() - awayAt >= 30000) { setLocked(true); setPin(""); setError(""); }
        awayAt = null; setPrivacy(false);
      }
    });
    return () => listener.remove();
  }, []);
  const configure: DeviceLock["configure"] = async (action, entered, next = "") => {
    const owner = scope; if (!owner || !available || locked || failure) throw new Error("Unlock the app before changing device security.");
    if (working.current) throw new Error("An unlock check is already in progress.");
    working.current = true; authenticationPrompt.current = true;
    try {
      const saved = action === "enable" ? await createPin(owner, next) : action === "change" ? await changePin(owner, entered, next)
        : action === "disable" ? (await removePin(owner, entered), null) : await setBiometric(owner, entered, action === "biometric-on");
      if (scopeRef.current === owner) setRecord(saved);
    } finally { authenticationPrompt.current = false; working.current = false; }
  };
  async function unlock(biometric = false) {
    const owner = scope; if (!owner || working.current) return;
    working.current = true; authenticationPrompt.current = biometric; setBusy(true); setError("");
    try {
      const saved = biometric ? await verifyBiometric(owner) : await verifyPin(owner, pin);
      if (scopeRef.current === owner) { setRecord(saved); setLocked(false); setPin(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not unlock. Try your app PIN."); setPin(""); }
    finally { working.current = false; authenticationPrompt.current = false; setBusy(false); }
  }
  const value: DeviceLock = { unlocked: !scope || (readyScope === scope && !locked && !privacy && !failure), available, enabled: !!record, biometric: !!record?.biometricHash, biometricSupported, configure, lockNow: () => { if (record) { setLocked(true); setPin(""); setError(""); } } };
  const blocked = !!scope && (readyScope !== scope || locked || !!failure || privacy);
  return <Context.Provider value={value}>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {(!scope || mountedScope === scope) && <View style={{ flex: 1, display: blocked ? "none" : "flex" }} accessibilityElementsHidden={blocked} importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}>{children}</View>}
      {blocked && <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center", gap: 20, width: "100%", maxWidth: 480, alignSelf: "center" }}>
          <Ionicons name="lock-closed-outline" size={38} color={colors.accentText} />
          <Text accessibilityRole="header" style={{ color: colors.primary, fontSize: 28, fontFamily: fonts.semibold }}>Unlock Sutura</Text>
          {failure ? <><Text accessibilityRole="alert" style={{ color: colors.dangerFg, lineHeight: 23 }}>{failure}</Text><NativeButton label="Try again" onPress={() => void check()} /></>
            : readyScope !== scope ? <ActivityIndicator accessibilityLabel="Loading device security" color={colors.orange} /> : <>
              <Text style={{ color: colors.slate500, fontSize: 15, lineHeight: 23 }}>Enter your app PIN to return to your account.</Text>
              <NativeInput accessibilityLabel="Six-digit app PIN" value={pin} onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 6))} secureTextEntry keyboardType="number-pad" inputMode="numeric" maxLength={6} autoComplete="off" textContentType="none" editable={!busy} style={{ minHeight: 64, borderRadius: 18, padding: 16, fontSize: 26, textAlign: "center", letterSpacing: 8, color: colors.primary, backgroundColor: colors.surfaceMuted }} onSubmitEditing={() => void unlock()} />
              {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerFg, lineHeight: 22 }}>{error}</Text>}
              <NativeButton label="Unlock" disabled={pin.length !== 6 || busy} loading={busy} onPress={() => void unlock()} />
              {!!record?.biometricHash && <NativeButton label="Use fingerprint or Face ID" disabled={busy} color={colors.surfaceMuted} onPress={() => void unlock(true)} />}
            </>}
          <NativePressable accessibilityRole="button" accessibilityLabel="Sign in with password instead" disabled={busy} onPress={() => { if (!busy) void onSignOut().catch(() => setError("Could not sign out. Try again.")); }} style={{ minHeight: 48, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.accentText, fontSize: 14 }}>Forgot PIN? Sign in with password</Text></NativePressable>
        </ScrollView>
      </SafeAreaView>}
    </View>
  </Context.Provider>;
}
