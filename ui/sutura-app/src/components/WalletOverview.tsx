import { StyleSheet, View, useWindowDimensions } from "react-native";
import { NativePressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { WalletPicker } from "./OperationForm";
import { WalletDepositQr } from "./WalletDepositQr";
import { WalletAction } from "./WalletAction";
import { Money } from "./Money";
import { formatClock } from "./StaleNotice";
import { fonts, type, type ThemeColors } from "../theme";

export function WalletOverview({ selectable = true, showDepositQr = false }: { selectable?: boolean; showDepositQr?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { data, selectedWallet, selectedWalletId, setSelectedWalletId, balanceHidden, toggleBalanceHidden, refreshError, lastUpdated, setTab } = useWallet();
  if (!data.wallets.length) return null;
  const active = selectedWallet.status === "ACTIVE";
  const time = formatClock(lastUpdated);
  return <View style={{ gap: 12 }}>
    {selectable && (data.wallets.length > 1 || !showDepositQr) && <WalletPicker compact wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />}
    {!selectable && <Text style={styles.meta}>{selectedWallet.name} · {selectedWallet.currency}</Text>}
    <View style={{ alignItems: showDepositQr ? "center" : "stretch", gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: showDepositQr ? "center" : "flex-start", gap: 4 }}>
        <Text style={[styles.meta, showDepositQr && { color: colors.walletMuted }]}>{showDepositQr ? "Your balance" : "Available balance"}</Text>
        <NativePressable accessibilityRole="button" accessibilityLabel={balanceHidden ? "Show balance" : "Hide balance"}
          onPress={toggleBalanceHidden} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={balanceHidden ? "eye-off-outline" : "eye-outline"} size={18} color={showDepositQr ? colors.walletMuted : colors.slate500} />
        </NativePressable>
      </View>
      <Money amount={selectedWallet.balance} currency={selectedWallet.currency} hidden={balanceHidden}
        style={[styles.balance, showDepositQr && { textAlign: "center", color: colors.walletInk, fontSize: width < 360 ? 27 : 32 }, !!refreshError && { color: colors.slate500 }]} />
    </View>
    {showDepositQr && <View style={styles.actions}>
      <WalletAction label="Send money" icon="paper-plane-outline" onPress={() => setTab("send")} disabled={!active} />
      <WalletAction label="Top up" icon="add" onPress={() => setTab("topup")} disabled={!active} />
      <WalletAction label="Withdraw" icon="remove" onPress={() => setTab("withdraw")} disabled={!active} />
      {active && <WalletDepositQr key={selectedWallet.id} walletId={selectedWallet.id} walletName={selectedWallet.name} currency={selectedWallet.currency} />}
    </View>}
    {!!refreshError && <Text style={{ color: colors.warningFg, fontSize: 13, lineHeight: 20 }}>{time ? `Balance from ${time}. It may be out of date.` : "Balance may be out of date."}</Text>}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  meta: { fontSize: type.caption, color: colors.slate500, flexShrink: 1 },
  balance: { fontSize: type.display, lineHeight: 44, fontFamily: fonts.semibold, color: colors.primary },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, paddingTop: 12 },
});
