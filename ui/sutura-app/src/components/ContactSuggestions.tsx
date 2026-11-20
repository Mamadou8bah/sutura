import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativePressable, NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { phoneContacts, suggestContacts, type PhoneContact } from "../utils/contactSuggestions";

/** Contact matching stays in memory on this device; only a selected number is used. */
export function ContactSuggestions({ value, onSelect }: { value: string; onSelect: (phone: string) => void }) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [state, setState] = useState<"off" | "ready" | "denied" | "unavailable">("off");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const loading = useRef(false);
  async function load(ask: boolean) {
    if (Platform.OS === "web" || loading.current) return;
    loading.current = true;
    if (active.current) setBusy(true);
    try {
      // Lazy import keeps manual phone entry usable on older APKs without this module.
      const api = await import("expo-contacts");
      let permission = await api.getPermissionsAsync();
      if (ask && !permission.granted && permission.canAskAgain) permission = await api.requestPermissionsAsync();
      if (!permission.granted) {
        if (active.current) { setContacts([]); setState(permission.canAskAgain ? "off" : "denied"); }
        return;
      }
      const rows = await api.Contact.getAllDetails([api.ContactField.FULL_NAME, api.ContactField.PHONES]);
      if (active.current) { setContacts(phoneContacts(rows)); setState("ready"); }
    } catch {
      if (active.current) { setContacts([]); setState("unavailable"); }
    } finally { loading.current = false; if (active.current) setBusy(false); }
  }
  useEffect(() => {
    active.current = true;
    void load(false);
    const subscription = AppState.addEventListener("change", next => {
      if (next === "active") void load(false);
      else if (next === "background") setContacts([]);
    });
    return () => { active.current = false; subscription.remove(); };
  }, []);
  if (Platform.OS === "web") return null;
  const suggestions = suggestContacts(contacts, value);
  return <View style={{ gap: 4 }}>
    {state !== "ready" && <NativePressable accessibilityRole="button" disabled={busy || state === "unavailable"}
      accessibilityLabel={state === "denied" ? "Allow contacts in Settings" : "Use phone contacts"}
      onPress={() => { if (state === "denied") void Linking.openSettings().catch(() => {}); else void load(true); }}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}>
      {busy ? <ActivityIndicator size="small" color={colors.slate500} /> : <Ionicons name="people-outline" size={18} color={colors.slate500} />}
      <Text style={{ color: colors.slate500, fontSize: 13, flexShrink: 1 }}>{state === "unavailable" ? "Contact suggestions need the latest app build" : state === "denied" ? "Allow contacts in Settings" : "Use phone contacts"}</Text>
    </NativePressable>}
    {state === "ready" && value.replace(/\D/g, "").length < 2 && <Text style={{ color: colors.slate500, fontSize: 12 }}>Enter a number to find matching contacts.</Text>}
    {suggestions.map(contact => <NativePressable key={contact.phone} accessibilityRole="button" accessibilityLabel={`Use ${contact.name}, ${contact.phone}`}
      onPress={() => onSelect(contact.phone)} style={{ minHeight: 56, paddingVertical: 8, flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Ionicons name="person-outline" size={18} color={colors.slate500} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={{ color: colors.primary, fontSize: 14 }} numberOfLines={1}>{contact.name}</Text><Text style={{ color: colors.slate500, fontSize: 13 }}>{contact.phone}</Text></View>
      <Ionicons name="arrow-up-outline" size={16} color={colors.slate500} />
    </NativePressable>)}
  </View>;
}
