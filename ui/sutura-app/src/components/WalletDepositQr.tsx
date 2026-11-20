import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { encodeWalletDepositQr } from "../utils/walletDepositQr";

/** Shows the deposit destination for the currently selected wallet. */
export function WalletDepositQr({ walletId, walletName, currency }: { walletId: number; walletName: string; currency: string }) {
  const { colors } = useTheme();
  const value = encodeWalletDepositQr(walletId);
  return (
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 12 }}>
        <View style={{ padding: 8, backgroundColor: "#ffffff", borderRadius: 16 }} accessibilityRole="image" accessibilityLabel={`Deposit QR for ${walletName}, ${currency}`}>
          <QRCode value={value} size={208} quietZone={16} color="#000000" backgroundColor="#ffffff" />
        </View>
        <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "600", textAlign: "center" }}>{walletName} · {currency}</Text>
        <Text style={{ color: colors.slate500, fontSize: 15, lineHeight: 23, textAlign: "center" }}>Show this code to a Sutura agent. They will check your account and enter the cash amount.</Text>
      </View>
  );
}
