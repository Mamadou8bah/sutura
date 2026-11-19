import { useState } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { NativeText as Text } from "./NativeControls";
import { WalletAction } from "./WalletAction";
import { SelectionSheet } from "./SelectionSheet";
import { useTheme } from "../context/ThemeContext";
import { encodeWalletDepositQr } from "../utils/walletDepositQr";

/** The deposit destination is one tap away; the balance card stays uncluttered. */
export function WalletDepositQr({ walletId, walletName, currency }: { walletId: number; walletName: string; currency: string }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const value = encodeWalletDepositQr(walletId);
  return <View>
    <WalletAction label="My QR" icon="qr-code-outline" onPress={() => setExpanded(true)} />
    <SelectionSheet visible={expanded} title="Your deposit QR" onClose={() => setExpanded(false)}>
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 12 }}>
        <View style={{ padding: 8, backgroundColor: "#ffffff", borderRadius: 16 }} accessibilityRole="image" accessibilityLabel={`Deposit QR for ${walletName}, ${currency}`}>
          <QRCode value={value} size={208} quietZone={16} color="#000000" backgroundColor="#ffffff" />
        </View>
        <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600", textAlign: "center" }}>{walletName} · {currency}</Text>
        <Text style={{ color: colors.slate500, fontSize: 15, lineHeight: 23, textAlign: "center" }}>Show this code to a Sutura agent. They will check your account and enter the cash amount.</Text>
      </View>
    </SelectionSheet>
  </View>;
}
