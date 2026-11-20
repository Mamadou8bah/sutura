import { SelectionSheet } from "./SelectionSheet";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { KeyboardScrollView as ScrollView } from "./KeyboardScrollView";
import { Modal, StyleSheet, View} from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";
import { brand } from "../constants/brand";
import { colors, fonts, radii } from "../theme";
import type { TabId } from "../types";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

type Action = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tab: TabId;
};

const actions: Action[] = [
  { label: "Top up", subtitle: "Add money via mobile or agent", icon: "add-circle-outline", tab: "topup" },
  { label: "Send money", subtitle: "Transfer to another wallet", icon: "paper-plane-outline", tab: "send" },
  { label: "Withdraw", subtitle: "Cash out at an agent", icon: "cash-outline", tab: "withdraw" },
  { label: "View activity", subtitle: "Recent account transactions", icon: "list-outline", tab: "activity" },
];

export function WalletActionsSheet() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    data,
    walletActionsTarget,
    closeWalletActions,
    setTab,
    setSelectedWalletId,
    balanceHidden,
  } = useWallet();

  const wallet = data.wallets.find((w) => w.id === walletActionsTarget);

  function runAction(tab: TabId) {
    if (wallet) setSelectedWalletId(wallet.id);
    closeWalletActions();
    setTab(tab);
  }

  return <SelectionSheet visible={walletActionsTarget !== null} title="Wallet actions" onClose={closeWalletActions}>
          {wallet ? (
            <>
              <Text style={styles.title}>{wallet.name}</Text>
              <Money amount={wallet.balance} currency={wallet.currency} hidden={balanceHidden} style={styles.balance} />
              <Text style={styles.meta}>{wallet.currency} · Wallet #{wallet.id}</Text>
              {wallet.status !== "ACTIVE" ? <View style={styles.status}><StatusPill status={wallet.status} /></View> : null}

              <View style={styles.actions}>
                {actions.map((action) => (
                  <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={`${action.label}, ${action.subtitle}`} style={styles.actionRow} onPress={() => runAction(action.tab)}>
                    <View style={styles.actionIcon}>
                      <Ionicons name={action.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.actionBody}>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                      <Text style={styles.actionSub}>{action.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate400} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancelBtn} onPress={closeWalletActions}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
  </SelectionSheet>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slate300,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: fonts.semibold, color: colors.slate900 },
  balance: { fontSize: 28, lineHeight: 34, fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, marginTop: 4 },
  status: { marginBottom: 12 },
  meta: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 4, marginBottom: 16 },
  actions: { gap: 8 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: 15, fontFamily: fonts.bold, color: colors.slate900 },
  actionSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  cancelBtn: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelText: { fontSize: 17, fontFamily: fonts.medium, color: colors.primary },
});
