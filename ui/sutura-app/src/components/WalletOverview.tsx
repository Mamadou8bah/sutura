import { StyleSheet, View, useWindowDimensions } from "react-native";
import { NativePressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { WalletPicker } from "./OperationForm";
import { WalletSurface } from "./WalletSurface";
import { WalletAction } from "./WalletAction";
import { Money } from "./Money";
import { fonts, type, type ThemeColors } from "../theme";

export function WalletOverview({ selectable = true, showQuickActions = false }: { selectable?: boolean; showQuickActions?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { data, selectedWallet, selectedWalletId, setSelectedWalletId, balanceHidden, toggleBalanceHidden, setTab } = useWallet();
  if (!data.wallets.length) return null;
  const active = selectedWallet.status === "ACTIVE";
  const BalanceSurface = showQuickActions ? WalletSurface : View;
  return <View style={{ gap: 16 }}>
    <BalanceSurface style={{ gap: 8 }}>
      {selectable && (data.wallets.length > 1 || !showQuickActions) && <WalletPicker compact wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />}
      {!selectable && <Text style={styles.meta}>{selectedWallet.name} · {selectedWallet.currency}</Text>}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: showQuickActions ? "space-between" : "flex-start", gap: 4 }}>
          <Text style={[styles.meta, showQuickActions && { color: colors.walletMuted }]}>Available balance</Text>
          <NativePressable accessibilityRole="button" accessibilityLabel={balanceHidden ? "Show balance" : "Hide balance"}
            onPress={toggleBalanceHidden} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={balanceHidden ? "eye-off-outline" : "eye-outline"} size={18} color={showQuickActions ? colors.walletMuted : colors.slate500} />
          </NativePressable>
        </View>
        <Money amount={selectedWallet.balance} currency={selectedWallet.currency} hidden={balanceHidden}
          style={[styles.balance, showQuickActions && { color: colors.walletInk, fontFamily: fonts.regular, letterSpacing: -0.5, fontSize: width < 360 ? 27 : 32 }]} />
      </View>
    </BalanceSurface>
    {showQuickActions && <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={styles.actionsTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <WalletAction label="Send" icon="paper-plane-outline" onPress={() => setTab("send")} disabled={!active} />
        <WalletAction label="Add Funds" icon="add" onPress={() => setTab("topup")} disabled={!active} />
        <WalletAction label="Withdraw" icon="cash-outline" onPress={() => setTab("withdraw")} disabled={!active} />
        <WalletAction label="QR" icon="scan-outline" onPress={() => setTab("scan")} />
      </View>
    </View>}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  meta: { fontSize: type.caption, color: colors.slate500, flexShrink: 1 },
  balance: { fontSize: type.display, lineHeight: 44, fontFamily: fonts.semibold, color: colors.primary },
  actionsTitle: { fontSize: type.caption, fontFamily: fonts.medium, color: colors.primary },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
});
