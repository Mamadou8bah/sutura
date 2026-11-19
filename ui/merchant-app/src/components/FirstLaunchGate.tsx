import { useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Image, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativePressable as Pressable, NativeText as Text, NativeButton } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { SUTURA_LOGO } from "../constants/brand";
import { fonts } from "../theme";

type Audience = "customer" | "agent" | "merchant";
const images = {
  people: require("../../assets/onboarding/merchant-shop.png"),
  wallet: require("../../assets/onboarding/merchant-qr.png"),
  confidence: require("../../assets/onboarding/merchant-paid.png"),
};
const slides: Record<Audience, { title: string; body: string; image: keyof typeof images }[]> = {
  customer: [
    { title: "Your everyday money, together.", body: "Send to people you know, pay local businesses and keep track of your money with Sutura.", image: "people" },
    { title: "From cash to scan & pay.", body: "Top up or withdraw through an agent. Scan a merchant’s QR and review the details before you pay.", image: "wallet" },
    { title: "A little care. More confidence.", body: "Verify your identity, check your payment details and find your receipts in Activity.", image: "confidence" },
  ],
  agent: [
    { title: "Keep your community moving.", body: "Help Sutura customers turn cash into wallet funds, and wallet funds into cash.", image: "people" },
    { title: "Scan. Check. Serve.", body: "Scan the customer’s code, confirm their wallet and review the amount before completing an operation.", image: "wallet" },
    { title: "Every operation, accounted for.", body: "Follow pending requests, check completed operations and share a receipt when you’re done.", image: "confidence" },
  ],
  merchant: [
    { title: "Good business starts here.", body: "Welcome your customers with a simpler way to pay using Sutura.", image: "people" },
    { title: "Your QR. Their next payment.", body: "Create a payment request, show its QR and let your customer review and pay from their wallet.", image: "wallet" },
    { title: "Know when you’ve been paid.", body: "Follow payment statuses and receipts in one place. Register your business to get started.", image: "confidence" },
  ],
};

/** Local first-install introduction, separate from registration and authentication. */
export function FirstLaunchGate({ app, authenticated = false, children }: { app: Audience; authenticated?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  const { width, height, fontScale } = useWindowDimensions();
  const key = `sutura_${app}_intro_completed`;
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const finishing = useRef(false);
  useEffect(() => {
    let active = true;
    if (authenticated) {
      setCompleted(true); setChecked(true);
      void AsyncStorage.setItem(key, "1").catch(() => undefined);
      return;
    }
    void AsyncStorage.getItem(key).then(value => { if (active) setCompleted(value === "1"); })
      .catch(() => undefined).finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [key, authenticated]);
  useHardwareBack(() => {
    if (authenticated || completed || !checked) return false;
    if (busy) return true;
    if (step > 0) { setStep(step - 1); return true; }
    return false;
  });
  async function finish() {
    if (finishing.current) return;
    finishing.current = true; setBusy(true);
    try { await AsyncStorage.setItem(key, "1"); }
    catch { /* Storage failure must not prevent signing in. Completion lasts for this launch. */ }
    finally { setCompleted(true); setBusy(false); finishing.current = false; }
  }
  if (authenticated || completed) return <>{children}</>;
  if (!checked) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}><ActivityIndicator accessibilityLabel="Getting Sutura ready" color={colors.orange} /></View>;
  const slide = slides[app][step];
  const imageHeight = Math.min(380, Math.max(220, height * .4));
  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView key={step} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image source={SUTURA_LOGO} accessibilityLabel="Sutura" resizeMode="contain" style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#ffffff" }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void finish()}
          style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}>
          <Text style={{ color: colors.slate500, fontFamily: fonts.medium, fontSize: 14 }}>Skip</Text>
        </Pressable>
      </View>
      <View style={{ flexGrow: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ height: imageHeight, alignItems: "center", justifyContent: "center", borderRadius: 32, overflow: "hidden", backgroundColor: colors.walletSurface }}>
          <Image source={images[slide.image]} resizeMode="contain" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: "100%", width: "100%" }} />
        </View>
        <View accessibilityLiveRegion="polite" style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: width < 360 ? 28 : 32, lineHeight: width < 360 ? 36 : 40, color: colors.primary }}>{slide.title}</Text>
          <Text style={{ fontSize: 15, lineHeight: 24, color: colors.slate500 }}>{slide.body}</Text>
        </View>
      </View>
      <View style={{ gap: 16, paddingTop: 4 }}>
        <View accessible accessibilityLabel={`Introduction, slide ${step + 1} of 3`} style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", minHeight: 20 }}>
          {slides[app].map((_, index) => <View key={index} style={{ width: index === step ? 24 : 7, height: 7, borderRadius: 4, backgroundColor: index === step ? colors.accentText : colors.border }} />)}
        </View>
        <NativeButton label={step === 2 ? "Get started" : "Next"} loading={busy} disabled={busy} onPress={() => step === 2 ? void finish() : setStep(step + 1)} />
        {step > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Previous introduction slide" disabled={busy} onPress={() => setStep(step - 1)} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.slate500, fontSize: 14 }}>Back</Text></Pressable>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
