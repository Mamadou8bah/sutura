import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "./AppHeader";
import { PrimaryButton } from "./ui";
import { colors, fonts, radii, spacing } from "../theme";

export function DemoVerificationFlow({ onExit, onDone }: { onExit: () => void; onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState("National ID");
  const [documentReady, setDocumentReady] = useState(false);
  const [selfieReady, setSelfieReady] = useState(false);
  const labels = ["Document", "Selfie", "Review"];
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <BackHeader title="Demo verification" onBack={() => step > 0 && step < 3 ? setStep(step - 1) : onExit()} />
    <Text style={styles.notice}>Practice with sample evidence. Nothing is uploaded and your real verification status stays unchanged.</Text>
    {step < 3 && <View style={styles.progress}>{labels.map((label, index) => <View key={label} style={styles.progressItem}><View style={[styles.dot, index <= step && styles.dotActive]}><Text style={[styles.dotText, index <= step && styles.dotTextActive]}>{index < step ? "✓" : index + 1}</Text></View><Text style={styles.progressLabel}>{label}</Text></View>)}</View>}
    {step === 0 && <>
      <Text style={styles.title}>Choose your document</Text><Text style={styles.body}>Select a document type to preview the identity check.</Text>
      <View accessibilityRole="radiogroup">{["National ID", "Passport", "Residence permit"].map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{checked: documentType === type}} onPress={() => {setDocumentType(type); setDocumentReady(false);}} style={[styles.option, documentType === type && styles.selected]}><Ionicons name="document-text-outline" size={23} color={colors.primary} /><Text style={styles.optionText}>{type}</Text><Ionicons name={documentType === type ? "radio-button-on" : "radio-button-off"} size={22} color={documentType === type ? colors.orangeDark : colors.slate400} /></Pressable>)}</View>
      {documentReady && <View style={styles.preview}><Ionicons name="id-card-outline" size={56} color={colors.primary} /><Text style={styles.previewTitle}>SAMPLE {documentType.toUpperCase()}</Text><Text style={styles.body}>Demo User · SAMPLE-0001</Text><Text style={styles.small}>Illustration for the walkthrough only</Text></View>}
      <PrimaryButton label={documentReady ? "Continue to selfie" : "Use sample document"} color={colors.orange} onPress={() => documentReady ? setStep(1) : setDocumentReady(true)} />
    </>}
    {step === 1 && <>
      <Text style={styles.title}>Face & liveness check</Text><Text style={styles.body}>In a live check, you would position your face in the frame and follow the on-screen prompts.</Text>
      <View style={styles.preview}><View style={styles.face}><Ionicons name="person-outline" size={88} color={colors.primary} /></View><Text style={styles.previewTitle}>{selfieReady ? "Sample selfie ready" : "Sample camera preview"}</Text><Text style={styles.small}>This demo does not access your camera or run a liveness model.</Text></View>
      <PrimaryButton label={selfieReady ? "Continue to review" : "Use sample selfie"} color={colors.orange} onPress={() => selfieReady ? setStep(2) : setSelfieReady(true)} />
    </>}
    {step === 2 && <>
      <Text style={styles.title}>Review sample submission</Text><Text style={styles.body}>Your preview contains the following sample evidence.</Text>
      <View style={styles.preview}><Ionicons name="documents-outline" size={42} color={colors.orangeDark} /><Text style={styles.previewTitle}>{documentType}</Text><Text style={styles.body}>Sample document and sample selfie included</Text></View>
      <PrimaryButton label="Simulate submission" color={colors.orange} onPress={() => setStep(3)} />
    </>}
    {step === 3 && <>
      <View style={styles.complete}><Ionicons name="checkmark-circle-outline" size={70} color={colors.orangeDark} /><Text style={styles.title}>Demo walkthrough complete</Text><Text style={styles.body}>You have previewed the document, selfie and submission steps. No identity decision was made or saved.</Text></View>
      <PrimaryButton label="Done" color={colors.orange} onPress={onDone} />
      <PrimaryButton label="Try again" color={colors.surfaceMuted} textColor={colors.primary} onPress={() => {setStep(0); setDocumentReady(false); setSelfieReady(false);}} />
    </>}
  </ScrollView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: 18 }, notice: { backgroundColor: colors.orangeLight, padding: 14, borderRadius: radii.sm, color: colors.primary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
  progress: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 }, progressItem: { alignItems: "center", gap: 7 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }, dotActive: { backgroundColor: colors.orange }, dotText: { color: colors.slate500, fontFamily: fonts.bold }, dotTextActive: { color: colors.primary }, progressLabel: { color: colors.slate500, fontFamily: fonts.medium, fontSize: 12 },
  title: { fontFamily: fonts.bold, fontSize: 23, color: colors.primary }, body: { fontFamily: fonts.regular, fontSize: 14, color: colors.slate500, lineHeight: 22 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, marginBottom: 10 }, selected: { borderColor: colors.orange, backgroundColor: colors.orangeLight }, optionText: { flex: 1, fontFamily: fonts.medium, color: colors.primary, fontSize: 15 },
  preview: { padding: 24, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: "center", gap: 12 }, previewTitle: { fontFamily: fonts.bold, color: colors.primary, fontSize: 15, textAlign: "center" }, small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.slate500, textAlign: "center" }, face: { width: 138, height: 170, borderRadius: 70, borderWidth: 2, borderColor: colors.orange, alignItems: "center", justifyContent: "center" }, complete: { alignItems: "center", gap: 20, paddingVertical: 32 },
});
