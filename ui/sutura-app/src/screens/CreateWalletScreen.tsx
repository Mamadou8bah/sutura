import { useRef, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput, Field, PrimaryButton, Screen } from "../components/ui";
import { NativeText as Text, NativePressable as Pressable } from "../components/NativeControls";
import { fonts } from "../theme";
import { useHardwareBack } from "../hooks/useBackNavigation";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";

export function CreateWalletScreen() {
  const { colors } = useTheme();
  const { data, refreshData, setTab, setSelectedWalletId } = useWallet();
  const available = ["GMD", "USD", "EUR", "GBP", "XOF"].filter(currency => !data.wallets.some(wallet => wallet.currency === currency));
  const [selectedCurrency, setCurrency] = useState(available[0] ?? "");
  const currency = available.includes(selectedCurrency) ? selectedCurrency : available[0] ?? "";
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
  const currencyNames: Record<string, string> = { GMD: "Gambian dalasi", USD: "US dollar", EUR: "Euro", GBP: "British pound", XOF: "West African CFA franc" };
  return <Screen>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to wallets" disabled={busy}
        onPress={() => setTab("wallets")} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: colors.surfaceMuted }}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
      </Pressable>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 24, color: colors.primary, flex: 1 }}>Create wallet</Text>
    </View>
    <Text style={{ color: colors.slate500, fontSize: 15, lineHeight: 23 }}>Give your wallet a name and choose the currency you want to hold.</Text>
    {!available.length ? <View style={{ padding: 20, borderRadius: 20, backgroundColor: colors.surfaceMuted, gap: 12 }}>
      <Ionicons name="checkmark-circle-outline" size={28} color={colors.accentText} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.primary }}>All currencies added</Text>
      <Text style={{ color: colors.slate500, lineHeight: 22 }}>You already have a wallet for every supported currency.</Text>
      <PrimaryButton label="View my wallets" onPress={() => setTab("wallets")} />
    </View> : <>
      <Field label="Wallet name"><AppInput accessibilityLabel="Wallet name" value={name} onChangeText={value => { setName(value); setError(""); }} editable={!busy}
        maxLength={60} autoCapitalize="words" placeholder="e.g. Travel fund" /></Field>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ color: colors.primary, fontFamily: fonts.semibold, fontSize: 16 }}>Choose currency</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Wallet currency" style={{ gap: 8 }}>
          {available.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value}, ${currencyNames[value]}`}
            accessibilityState={{ checked: value === currency, disabled: busy }} disabled={busy} onPress={() => { setCurrency(value); setError(""); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: value === currency ? colors.accentText : colors.border, backgroundColor: value === currency ? colors.orangeLight : colors.surface }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.primary, width: 38 }}>{value}</Text>
            <Text style={{ color: colors.primary, fontSize: 14, flex: 1 }}>{currencyNames[value]}</Text>
            <Ionicons name={value === currency ? "radio-button-on" : "radio-button-off"} size={22} color={value === currency ? colors.accentText : colors.slate500} />
          </Pressable>)}
        </View>
      </View>
      <Text style={{ color: colors.slate500, fontSize: 12, lineHeight: 19 }}>One wallet per currency. Your personal GMD wallet is created when you join.</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.rose800, lineHeight: 20 }}>{error}</Text>}
      <PrimaryButton loading={busy} label={busy ? "Creating…" : `Create ${currency} wallet`} disabled={busy || !name.trim() || !available.includes(currency)} onPress={() => void create()} />
    </>}
  </Screen>;
}
