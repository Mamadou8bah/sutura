import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import QRCode from "react-native-qrcode-svg";
import { StyleSheet, View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { colors, radii } from "../theme";
import type { AgentQrPayload } from "../types";
import { encodeAgentQrPayload } from "../utils/agentQr";
import { formatMoney } from "../utils/format";

export function AgentQrCard({
  payload,
  title,
  hint,
}: {
  payload: AgentQrPayload;
  title: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const value = encodeAgentQrPayload(payload);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.content}>
        <View style={styles.qrBox}>
          <QRCode value={value} size={160} />
        </View>
        <View style={styles.details}>
          <Detail label="Reference" value={payload.reference} highlight />
          <Detail label="Wallet" value={`${payload.walletName} #${payload.walletId}`} />
          <Detail label="Amount" value={formatMoney(Number(payload.amount), payload.currency)} />
          <Detail label="Status" value="Awaiting agent scan" status />
        </View>
      </View>

      <Text style={styles.footer}>
        An agent scans this code to complete the {payload.operation.toLowerCase()} on your wallet.
      </Text>
    </View>
  );
}

function Detail({
  label,
  value,
  highlight,
  status,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  status?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailHighlight, status && styles.detailStatus]}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: 16,
    marginTop: 16,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.slate900 },
  hint: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  content: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16, alignItems: "flex-start" },
  qrBox: {
    backgroundColor: "#ffffff",
    borderRadius: radii.md,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  details: { flex: 1, minWidth: 140, gap: 8 },
  detailRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.slate500,
  },
  detailValue: { fontSize: 13, fontWeight: "700", color: colors.slate900, marginTop: 2 },
  detailHighlight: { color: colors.primary, fontFamily: "monospace", fontSize: 12 },
  detailStatus: { color: colors.orange },
  footer: { fontSize: 12, fontWeight: "600", color: colors.slate500, marginTop: 16, textAlign: "center" },
});
