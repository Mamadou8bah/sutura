import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { kycApi, type KycStatus } from "../api/kyc";

import { isDemoMode } from "../api/demo";
import { DemoVerificationFlow } from "../components/DemoVerificationFlow";
import { colors } from "../theme";

const descriptions: Record<KycStatus["status"], string> = {
  NOT_STARTED: "Verify your identity using an identity document and a face and liveness check.",
  PENDING: "Complete the steps on your verification page, then check your status here.",
  EXPIRED: "Your verification link expired. Start again for a new link.",
  VERIFIED: "Your identity has been verified.",
  FLAGGED: "Your identity check needs review. Check back for the result.",
  REJECTED: "Your identity could not be verified. You can try again with clear, valid evidence.",
};

export function VerificationScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [demoStarted, setDemoStarted] = useState(false);
  const [record, setRecord] = useState<KycStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);

  async function run(action: "load" | "start" | "refresh") {
    if (inFlight.current) return;
    if (action === "start" && isDemoMode()) { setDemoStarted(true); return; }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "load") {
        let stored = await kycApi.status();
        if (stored.status === "NOT_STARTED" && !isDemoMode()) stored = await kycApi.start();
        if (active.current) setRecord(stored);
        if (stored.sessionId) {
          const fresh = await kycApi.refresh();
          if (active.current) setRecord(fresh);
        }
      } else {
        const value = await kycApi[action]();
        if (active.current) setRecord(value);
      }
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : "Verification is unavailable");
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  useEffect(() => {
    active.current = true;
    void run("load");
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run("load");
    });
    return () => { active.current = false; subscription.remove(); };
  }, []);

  useAutoRefresh(()=>run("load"),!isDemoMode()&&(record?.status==="PENDING"||!!error||!record));

  async function openVerification() {
    const url = record?.hostedUrl;
    if (!url || !/^https?:\/\//i.test(url)) { setError("Verification link is unavailable"); return; }
    try { await Linking.openURL(url); }
    catch { setError("Could not open verification. Please try again."); }
  }

  if (demoStarted && isDemoMode()) return <DemoVerificationFlow onExit={() => setDemoStarted(false)} onDone={onBack} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to your account" onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.primary}/></Pressable><Text style={styles.headerTitle}>Identity verification</Text></View>
      <View style={styles.intro}><View style={styles.heroIcon}><Ionicons name={record?.status === "VERIFIED" ? "shield-checkmark-outline" : "person-outline"} size={38} color={colors.orange}/></View><Text style={styles.title}>{record?.status === "VERIFIED" ? "You're verified" : "Let's verify it's you"}</Text><Text style={styles.body}>{record?.status === "VERIFIED" ? "Your identity check is complete." : "A few simple steps to confirm your identity and protect your account."}</Text></View>
      <View style={styles.card}>
        {record?.status !== "NOT_STARTED" && <View style={styles.statusRow}><View style={[styles.dot,{backgroundColor:record?.status === "VERIFIED" ? colors.emerald700 : colors.orange}]}/><Text style={styles.status}>{record ? ({PENDING:"In progress",EXPIRED:"Link expired",VERIFIED:"Verified",FLAGGED:"Under review",REJECTED:"Please try again",NOT_STARTED:"Ready to begin"})[record.status] : "Checking your status…"}</Text></View>}
        {record && ["NOT_STARTED","EXPIRED","REJECTED"].includes(record.status) && <View style={styles.steps}>{([
          ["card-outline","Identity document","Have a valid identity document ready."],
          ["scan-outline","Face and liveness check","Follow the camera prompts in good lighting."],
          ["shield-checkmark-outline","Review","We'll show your verification result here."]
        ] as const).map(([icon,title,hint],index)=><View key={title} style={styles.step}><View style={styles.stepIcon}><Ionicons name={icon} size={23} color={colors.primary}/></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepHint}>{hint}</Text></View><Text style={styles.number}>{index+1}</Text></View>)}</View>}
        {record && record.status !== "NOT_STARTED" && <Text style={styles.body}>{isDemoMode() ? "Explore the verification steps with sample evidence." : descriptions[record.status]}</Text>}
        {busy && <ActivityIndicator color={colors.orange} accessibilityLabel="Updating verification" />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {record && ["NOT_STARTED", "EXPIRED", "REJECTED"].includes(record.status) && (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run("start")} style={[styles.button, busy && styles.disabled]}><Text style={styles.buttonText}>Start verification</Text></Pressable>
        )}
        {record?.status === "PENDING" && record.hostedUrl && (
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void openVerification()} style={styles.button}><Text style={styles.buttonText}>Continue verification</Text></Pressable>
        )}
        {record?.sessionId && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run("refresh")}><Text style={styles.link}>Refresh status</Text></Pressable>}
        {!record && !busy && <Pressable accessibilityRole="button" onPress={() => void run("load")}><Text style={styles.link}>Try again</Text></Pressable>}
      </View>
    </ScrollView>
  );
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { flexGrow:1, padding:20, paddingBottom:36, gap:24, width:"100%", maxWidth:560, alignSelf:"center" },
  header:{flexDirection:"row",alignItems:"center",gap:12},
  back:{padding:10,marginLeft:-10},
  headerTitle:{fontFamily:fonts.medium,fontSize:16,color:colors.primary},
  intro:{gap:14,paddingTop:16},
  heroIcon:{width:72,height:72,borderRadius:20,backgroundColor:colors.surfaceMuted,alignItems:"center",justifyContent:"center",marginBottom:6},
  title: {fontFamily:fonts.bold,fontSize:30,lineHeight:37,color:colors.primary},
  card: {gap:22},
  statusRow:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:colors.surfaceMuted,padding:14,borderRadius:10},
  dot:{width:7,height:7,borderRadius:4},
  status: {fontFamily:fonts.medium,color:colors.primary,fontSize:13},
  body: {fontFamily:fonts.regular,color:colors.slate500,lineHeight:22,fontSize:14},
  steps:{gap:0},
  step:{flexDirection:"row",alignItems:"center",gap:14,paddingVertical:20,borderBottomWidth:1,borderBottomColor:colors.border},
  stepIcon:{width:44,height:44,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:"center",justifyContent:"center"},
  stepCopy:{flex:1,gap:6},
  stepTitle:{fontFamily:fonts.medium,color:colors.primary,fontSize:15},
  stepHint:{fontFamily:fonts.regular,color:colors.slate500,fontSize:12,lineHeight:18},
  number:{fontFamily:fonts.medium,color:colors.slate500,fontSize:12},
  link: {fontFamily:fonts.medium,color:colors.primary,fontSize:14,paddingVertical:10},
  error: {fontFamily:fonts.regular,color:colors.rose800,fontSize:14,lineHeight:21},
  button: {backgroundColor:colors.orange,borderRadius:12,minHeight:52,padding:16,alignItems:"center",justifyContent:"center"},
  buttonText: {fontFamily:fonts.bold,color:"#181a20",fontSize:15},
  disabled: {opacity:0.5},
});
