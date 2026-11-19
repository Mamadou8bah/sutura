import { useState } from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { Screen, SuturaLogo, PrimaryButton } from "../components/ui";
import { Heading } from "../components/MerchantUI";
import { SelectionSheet } from "../components/SelectionSheet";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { fonts, type } from "../theme";

const items = [
  ["wallets", "wallet-outline", "Business wallets"],
  ["verification", "shield-checkmark-outline", "Identity verification"],
  ["support", "chatbubble-ellipses-outline", "Help and support"],
  ["settings", "settings-outline", "Settings"],
] as const;

export function MoreScreen() {
  const { colors } = useTheme();
  const { session, setScreen, signOut } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Screen>
    <Heading title="More" />
    <View style={{ flexDirection: "row", gap: 16, alignItems: "center", paddingVertical: 8 }}>
      <SuturaLogo size={48} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.headline, color: colors.primary }}>{session?.businessName || "Merchant account"}</Text>
        {!!session?.email && <Text style={{ color: colors.slate500, fontSize: type.caption }}>{session.email}</Text>}
      </View>
    </View>
    <View>
      {items.map(([route, icon, label]) => <Pressable accessibilityRole="button" accessibilityLabel={label} key={route} onPress={() => setScreen(route)}
        style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.primary, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body }}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.slate500} />
      </Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => { setError(""); setConfirm(true); }}
        style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 56, paddingVertical: 12 }}>
        <Ionicons name="log-out-outline" size={22} color={colors.dangerFg} />
        <Text style={{ color: colors.dangerFg, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body }}>Sign out</Text>
      </Pressable>
    </View>
    <SelectionSheet visible={confirm} title="Sign out?" onClose={() => { if (!busy) setConfirm(false); }}>
      <View style={{ gap: 20 }}>
        <Text style={{ color: colors.slate500, lineHeight: 22, fontSize: type.body }}>You will need to sign in again to access your account.</Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerFg }}>{error}</Text>}
        <PrimaryButton loading={busy} label={busy ? "Signing out…" : "Confirm sign out"} disabled={busy} onPress={() => {
          if (busy) return; setBusy(true);
          void signOut().catch(() => setError("Could not sign out. Try again.")).finally(() => setBusy(false));
        }} />
      </View>
    </SelectionSheet>
  </Screen>;
}
