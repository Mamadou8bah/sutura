import { AppInput } from "./ui";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "./NativeControls";
import { authFetch, readAuthJson } from "../api/sessionAuth";
import { BackHeader } from "./AppHeader";
import { colors, spacing } from "../theme";

type Ticket = { id: number; subject: string; message: string; status: string; staffReply: string | null };

export function SupportTickets({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await authFetch("/api/v1/support");
    setTickets(await readAuthJson<Ticket[]>(response));
  }, []);
  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Could not load tickets")); }, [load]);
  async function send() {
    if (busy || !subject.trim() || !message.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await readAuthJson<Ticket>(await authFetch("/api/v1/support", {
        method: "POST", body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      }));
      setSubject(""); setMessage("");
      setNotice("Ticket submitted. Staff replies will appear below.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit ticket"); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <BackHeader title="Support" onBack={onBack} />
    <Text style={styles.text}>Describe your issue and include the operation reference if relevant. Never send passwords, PINs or identity document images here.</Text>
    <AppInput accessibilityLabel="Ticket subject" style={styles.input} value={subject} onChangeText={setSubject} maxLength={160} placeholder="Subject" editable={!busy} />
    <AppInput accessibilityLabel="Ticket message" style={[styles.input, styles.message]} value={message} onChangeText={setMessage} maxLength={5000} placeholder="How can we help?" multiline editable={!busy} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text style={styles.text}>{notice}</Text>}
    <Pressable accessibilityRole="button" style={styles.button} disabled={busy || !subject.trim() || !message.trim()} onPress={send}><Text style={styles.buttonText}>{busy ? "Submitting..." : "Submit ticket"}</Text></Pressable>
    <Pressable onPress={() => { setError(""); load().catch((err) => setError(err instanceof Error ? err.message : "Could not refresh")); }}><Text style={styles.text}>Refresh replies</Text></Pressable>
    {tickets.map((ticket) => <View style={styles.card} key={ticket.id}>
      <Text style={styles.title}>#{ticket.id} · {ticket.subject}</Text>
      <Text style={styles.text}>{ticket.status}</Text>
      <Text style={styles.text}>{ticket.message}</Text>
      <Text style={styles.text}>{ticket.staffReply ? `Staff reply: ${ticket.staffReply}` : "Awaiting a staff reply"}</Text>
    </View>)}
  </ScrollView></KeyboardAvoidingView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 32, gap: 14 },
  text: { color: colors.slate800, fontSize: 14, lineHeight: 21 },
  title: { color: colors.slate900, fontSize: 16, fontWeight: "700" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.slate900 },
  message: { minHeight: 120, textAlignVertical: "top" },
  error: { color: colors.rose800 },
  button: { backgroundColor: colors.orange, padding: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#181a20", fontWeight: "700" },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
});
