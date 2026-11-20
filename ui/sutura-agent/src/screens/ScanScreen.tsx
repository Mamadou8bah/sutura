import { parseWalletDepositQr } from "../utils/walletDepositQr";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
const NativeCamera = lazy(() => import("../components/NativeCamera"));
import { Ionicons } from "@expo/vector-icons";
import { ScreenTitle } from "../components/AppHeader";
import { AppInput, Field, FormError, PrimaryButton } from "../components/ui";
import { useAgent } from "../context/AgentContext";
import { brand } from "../constants/brand";
import { parseAgentQr } from "../utils/agentQr";
import { colors, fonts, radii, spacing } from "../theme";

export function ScanScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { lookupReference, lookupQr, prepareDepositQr } = useAgent();
  const lookupInFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(Platform.OS !== "web");

  const handleReference = useCallback(async () => {
    if (lookupInFlight.current || !reference.trim()) return;
    lookupInFlight.current = true; setBusy(true); setError(null);
    try {
      const wallet = parseWalletDepositQr(reference.trim());
      const signed = parseAgentQr(reference.trim());
      if (!wallet && !signed && reference.trim().startsWith("{")) { setError("QR expired or invalid. Ask the customer for a fresh code."); return; }
      const result = wallet ? await prepareDepositQr(wallet) : signed ? await lookupQr(signed) : await lookupReference(reference.trim());
      if (!result.ok) setError(result.error ?? null);
    } finally { lookupInFlight.current = false; setBusy(false); }
  }, [lookupReference, lookupQr, prepareDepositQr, reference]);

  const handleBarcode = useCallback(
    async (raw: string) => {
      if (lookupInFlight.current) return;
      setScanning(false);
      setError(null);
      const wallet = parseWalletDepositQr(raw);
      const payload = wallet ?? parseAgentQr(raw);
      if (!payload) {
        setError("QR expired or invalid. Ask the customer for a fresh code.");
        return;
      }
      lookupInFlight.current = true; setBusy(true);
      try {
        const result = wallet ? await prepareDepositQr(wallet) : await lookupQr(payload as import("../types").AgentQrPayload);
        if (!result.ok) setError(result.error ?? null);
      } finally { lookupInFlight.current = false; setBusy(false); }
    },
    [lookupQr, prepareDepositQr],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Scan customer QR" subtitle="Cash-out requires the customer’s current QR code." />

      {scanning && Platform.OS !== "web" ? (
        <Suspense fallback={<Text>Opening camera...</Text>}>
          <NativeCamera onCode={handleBarcode} onManual={() => setScanning(false)} />
        </Suspense>
      ) : (
        <View style={styles.manual}>
          <Field label="Reference or QR code" hint="Cash-in accepts a reference. Cash-out requires a current customer QR.">
            <AppInput
              accessibilityLabel="Reference or QR code"
              value={reference}
              onChangeText={setReference}
              placeholder="dep_1301"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <FormError message={error} />
          <PrimaryButton loading={busy} label={busy ? "Looking up…" : "Look up operation"} disabled={busy || !reference.trim()} onPress={handleReference} color={brand.orange} />
          {Platform.OS !== "web" ? (
            <Pressable onPress={() => setScanning(true)} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>Open camera scanner</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
  cameraWrap: { gap: 12 },
  camera: { height: 280, borderRadius: radii.lg, overflow: "hidden" },
  cameraPlaceholder: {
    height: 280,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraHint: { fontSize: 14, fontFamily: fonts.regular, color: colors.slate500, textAlign: "center" },
  manual: { gap: 12 },
  toggleBtn: { alignItems: "center", paddingVertical: 8 },
  toggleText: { fontSize: 14, fontFamily: fonts.bold, color: colors.primary },
});
