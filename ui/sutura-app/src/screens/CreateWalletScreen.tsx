import { useRef, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput, Field, PrimaryButton, Screen } from "../components/ui";
import { NativeText as Text, NativePressable as Pressable } from "../components/NativeControls";
import { NativeSelect } from "../components/NativeControls";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";

export function CreateWalletScreen() {
  const { colors } = useTheme();
  const { data, refreshData, setTab, setSelectedWalletId } = useWallet();
  const available = ["GMD", "USD", "EUR", "GBP", "XOF"].filter(currency => !data.wallets.some(wallet => wallet.currency === currency));
  const [currency, setCurrency] = useState(available[0] ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useHardwareBack(() => busy);
  async function create() {
    if (submitting.current) return;
    if (!name.trim() || !available.includes(currency)) { setError("Enter a wallet name and choose an available currency."); return; }
    submitting.current = true; setBusy(true); setError("");
    try {
      const wallet = await api.createWallet(name.trim(), currency);
      // Creation already succeeded; a failed refresh must not invite a second create.
      await refreshData().catch(() => undefined);
      setSelectedWalletId(wallet.id); setTab("wallets");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create wallet."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to wallets" disabled={busy}
      onPress={() => setTab("wallets")} style={{ width: 48, height: 48, justifyContent: "center" }}>
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </Pressable>
    <View style={{ gap: 8, marginBottom: 8 }}><Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "700", color: colors.primary }}>Create a wallet</Text>
      <Text style={{ color: colors.slate500, lineHeight: 21 }}>Your personal GMD wallet is provided automatically. Add another currency for your payments.</Text></View>
    {!available.length ? <Text style={{ color: colors.slate500 }}>You already have a wallet for every supported currency.</Text> : <>
      <Field label="Wallet name"><AppInput accessibilityLabel="Wallet name" value={name} onChangeText={setName} editable={!busy}
        maxLength={60} autoCapitalize="words" placeholder="e.g. Travel" /></Field>
      <NativeSelect title="Currency" value={currency} onChange={setCurrency} disabled={busy}
        options={available.map(value => ({ value, label: value }))} />
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800, lineHeight: 20 }}>{error}</Text>}
      <PrimaryButton label={busy ? "Creating…" : "Create wallet"} disabled={busy || !name.trim() || !available.includes(currency)} onPress={() => void create()} />
    </>}
  </Screen>;
}
