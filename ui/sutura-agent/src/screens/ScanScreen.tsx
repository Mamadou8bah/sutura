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

  const { lookupReference, lookupQr } = useAgent();
  const lookupInFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(Platform.OS !== "web");

  const handleReference = useCallback(async () => {
    if (lookupInFlight.current || !reference.trim()) return;
    lookupInFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await lookupReference(reference.trim());
      if (!result.ok) setError(result.error ?? null);
    } finally { lookupInFlight.current = false; setBusy(false); }
  }, [lookupReference, reference]);

  const handleBarcode = useCallback(
    async (raw: string) => {
      if (lookupInFlight.current) return;
      setScanning(false);
      setError(null);
      const payload = parseAgentQr(raw);
      if (!payload) {
        setError("Unrecognized Sutura QR code.");
        return;
      }
      lookupInFlight.current = true; setBusy(true);
      try {
        const result = await lookupQr(payload);
        if (!result.ok) setError(result.error ?? null);
      } finally { lookupInFlight.current = false; setBusy(false); }
    },
    [lookupQr],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Scan operation" subtitle="Scan a customer QR or enter a reference manually" />

      {scanning && Platform.OS !== "web" ? (
        <Suspense fallback={<Text>Opening camera...</Text>}>
          <NativeCamera onCode={handleBarcode} onManual={() => setScanning(false)} />
        </Suspense>
      ) : (
        <View style={styles.manual}>
          <Field label="Operation reference" hint="Example: dep_1301 or wd_901">
            <AppInput
              value={reference}
              onChangeText={setReference}
              placeholder="dep_1301"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <FormError message={error} />
          <PrimaryButton label={busy ? "Looking up..." : "Look up operation"} disabled={busy || !reference.trim()} onPress={handleReference} color={brand.orange} />
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
