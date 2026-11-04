import { useState } from "react";
import { View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import { WalletPicker } from "./OperationForm";
import { formatBalance } from "../utils/format";
export function WalletOverview({ deposit = true, selectable = true }: {
    deposit?: boolean;
    selectable?: boolean;
}) {
    const { colors } = useTheme();
    const { data, selectedWallet, selectedWalletId, setSelectedWalletId, balanceHidden, toggleBalanceHidden, setTab } = useWallet();
    const [balanceWidth, setBalanceWidth] = useState(240);
    const balance = formatBalance(selectedWallet.balance, selectedWallet.currency, balanceHidden);
    const balanceFontSize = Math.min(36, balanceWidth / (Math.max(balance.length, 1) * 0.65));
    if (!data.wallets.length)
        return null;
    return <View style={{ gap: 16, paddingVertical: 8 }}>{selectable ? <WalletPicker compact wallets={data.wallets} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden}/> : <Text style={{color:colors.slate500,fontSize:13}}>{selectedWallet.name} · {selectedWallet.currency}</Text>}<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Text style={{ color: colors.slate500, fontSize: 13 }}>Available balance</Text><Pressable accessibilityRole="button" accessibilityLabel={balanceHidden ? "Show balance" : "Hide balance"} hitSlop={10} onPress={toggleBalanceHidden}><Ionicons name={balanceHidden ? "eye-off-outline" : "eye-outline"} color={colors.slate500} size={18}/></Pressable></View><View onLayout={event => setBalanceWidth(event.nativeEvent.layout.width)}><Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: balanceFontSize, fontWeight: "700", letterSpacing: -1, color: colors.primary }}>{balance}</Text></View>{deposit && <Pressable accessibilityRole="button" accessibilityLabel="Top up" onPress={() => setTab("topup")} style={{ backgroundColor: colors.orange, alignSelf: "flex-start", paddingHorizontal: 28, paddingVertical: 13, borderRadius: 8 }}><Text style={{ color: "#181a20", fontWeight: "700" }}>Add money</Text></Pressable>}</View>;
}
