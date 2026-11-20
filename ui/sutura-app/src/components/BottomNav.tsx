import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { useWallet } from "../context/WalletContext";
import { WalletDepositQr } from "./WalletDepositQr";
import { SelectionSheet } from "./SelectionSheet";
import type { ThemeColors } from "../theme";
import type { TabId } from "../types";

type Glyph = keyof typeof Ionicons.glyphMap;

const tabs = [
  { id: "home", label: "Home", icon: "home-outline", selectedIcon: "home" },
  { id: "wallets", label: "Wallet", icon: "wallet-outline", selectedIcon: "wallet" },
  { id: "actions", label: "Open payment actions", icon: "add", selectedIcon: "add" },
  { id: "activity", label: "Transactions", icon: "receipt-outline", selectedIcon: "receipt" },
  { id: "profile", label: "Profile", icon: "person-outline", selectedIcon: "person" },
] satisfies { id: TabId | "actions"; label: string; icon: Glyph; selectedIcon: Glyph }[];

const actions: { tab: TabId; label: string; icon: Glyph }[] = [
  { tab: "send", label: "Send money", icon: "paper-plane-outline" },
  { tab: "topup", label: "Add money", icon: "add-circle-outline" },
  { tab: "scan", label: "Scan QR", icon: "scan-outline" },
  { tab: "withdraw", label: "Withdraw", icon: "cash-outline" },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const keyboardVisible = useKeyboardVisible();
  const { selectedWallet } = useWallet();
  const [sheet, setSheet] = useState<"actions" | "deposit" | null>(null);
  if (keyboardVisible) return null;

  return <View style={styles.wrapper}>
    <View accessibilityRole="tablist" style={styles.dock}>
      {tabs.map(item => {
        const selected = active === item.id;
        const central = item.id === "actions";
        const tint = selected ? colors.accentText : colors.slate500;
        return <Pressable key={item.id} accessibilityRole={central ? "button" : "tab"} accessibilityLabel={item.label}
          aria-selected={central ? undefined : selected}
          accessibilityState={central ? { expanded: sheet === "actions" } : { selected }}
          onPress={() => {
            if (item.id === "actions") setSheet(item.id);
            else if (!selected) onChange(item.id);
          }}
          style={styles.item}>
          {central ? <View style={styles.plus}>
            <Ionicons name="add" size={28} color={colors.actionInk} />
          </View> : <>
            <Ionicons name={selected ? item.selectedIcon : item.icon} size={20} color={tint} />
            <Text style={[styles.label, item.id === "activity" && styles.transactionsLabel, { color: tint }]}>{item.label}</Text>
          </>}
        </Pressable>;
      })}
    </View>
    <SelectionSheet visible={sheet !== null} title={sheet === "deposit" ? "Your deposit QR" : "Payment actions"} onClose={() => setSheet(null)}>
      {sheet === "deposit" && selectedWallet.id ? <WalletDepositQr walletId={selectedWallet.id} walletName={selectedWallet.name}
          currency={selectedWallet.currency} /> : <View style={styles.actions}>
          {actions.map(action => <Pressable key={action.tab} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => {
            setSheet(null);
            onChange(action.tab);
          }} style={styles.action}>
            <Ionicons name={action.icon} size={20} color={colors.accentText} />
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.slate500} />
          </Pressable>)}
          {!!selectedWallet.id && selectedWallet.status === "ACTIVE" && <Pressable accessibilityRole="button" accessibilityLabel="My deposit QR" onPress={() => setSheet("deposit")} style={styles.action}>
            <Ionicons name="qr-code-outline" size={20} color={colors.accentText} />
            <Text style={styles.actionLabel}>My deposit QR</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.slate500} />
          </Pressable>}
        </View>}
    </SelectionSheet>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  dock: { flexDirection: "row", alignItems: "center", borderRadius: 32, paddingVertical: 3, backgroundColor: colors.walletHighlight,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  item: { flex: 1, minWidth: 0, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 3, padding: 2 },
  plus: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.actionFill, alignItems: "center", justifyContent: "center",
    shadowColor: colors.actionFill, shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  label: { fontSize: 11, textAlign: "center" },
  transactionsLabel: { fontSize: 10 },
  actions: { gap: 6 },
  action: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  actionLabel: { flex: 1, fontSize: 15, color: colors.primary },
});
