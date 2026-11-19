import { StyleSheet, View } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { useTheme } from "../context/ThemeContext";
import { fonts, type } from "../theme";

/**
 * Status stamp shared by the customer, agent and merchant apps (identical copies).
 * Pattern from zender `Status`: a dot plus a sentence-case label, so colour is
 * never the only signal. Raw enum codes never reach the screen.
 */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "muted";

const TONES: Record<Exclude<Tone, "neutral">, readonly string[]> = {
  success: ["COMPLETED", "POSTED", "PAID", "VERIFIED", "APPROVED", "SUCCESS", "SUCCEEDED", "SETTLED"],
  warning: ["PENDING", "AWAITING_AGENT", "NOT_STARTED", "MORE_INFO_REQUIRED", "ACTION_REQUIRED", "PENDING_PAYMENT", "PENDING_VERIFICATION", "CORRECTION_REQUIRED"],
  info: ["PENDING_REVIEW", "REVIEW", "UNDER_REVIEW", "IN_REVIEW", "FLAGGED", "ACTIVE", "IN_PROGRESS", "PROCESSING", "SUBMITTED", "OPEN"],
  danger: ["FAILED", "REJECTED", "SUSPENDED", "REVERSED", "CLOSED", "DECLINED", "BLOCKED"],
  muted: ["EXPIRED", "CANCELLED", "CANCELED", "INACTIVE"],
};

const LABELS: Record<string, string> = {
  PENDING_REVIEW: "Under review",
  REVIEW: "Under review",
  UNDER_REVIEW: "Under review",
  IN_REVIEW: "Under review",
  AWAITING_AGENT: "Awaiting agent",
  NOT_STARTED: "Not verified",
  MORE_INFO_REQUIRED: "More information needed",
  ACTION_REQUIRED: "Action needed",
  CORRECTION_REQUIRED: "Correction needed",
  PENDING_PAYMENT: "Awaiting payment",
  PENDING_VERIFICATION: "Awaiting verification",
  IN_PROGRESS: "In progress",
  ACTIVE: "Awaiting payment",
  CANCELED: "Cancelled",
};

export function statusTone(value: string | null | undefined): Tone {
  const key = String(value ?? "").toUpperCase();
  for (const [tone, values] of Object.entries(TONES)) {
    if (values.includes(key)) return tone as Tone;
  }
  return "neutral";
}

export function statusLabel(value: string | null | undefined): string {
  const key = String(value ?? "").toUpperCase();
  if (!key) return "Unknown";
  if (LABELS[key]) return LABELS[key];
  const text = key.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toneColors(tone: Tone, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (tone) {
    case "success": return { fg: colors.successFg, bg: colors.successBg };
    case "warning": return { fg: colors.warningFg, bg: colors.warningBg };
    case "danger": return { fg: colors.dangerFg, bg: colors.dangerBg };
    case "info": return { fg: colors.infoFg, bg: colors.infoBg };
    case "muted": return { fg: colors.mutedFg, bg: colors.mutedBg };
    default: return { fg: colors.neutralFg, bg: colors.neutralBg };
  }
}

export function StatusPill({ status, tone, label, plain = false }: {
  status: string | null | undefined;
  tone?: Tone;
  label?: string;
  /** Dot and label without the tinted background, for dense rows. */
  plain?: boolean;
}) {
  const { colors } = useTheme();
  const resolved = tone ?? statusTone(status);
  const text = label ?? statusLabel(status);
  const { fg, bg } = toneColors(resolved, colors);
  return <View accessible accessibilityLabel={`Status: ${text}`}
    style={[styles.pill, plain ? styles.plain : { backgroundColor: bg }]}>
    <View style={[styles.dot, { backgroundColor: fg }]} />
    <Text style={[styles.label, { color: fg }]}>{text}</Text>
  </View>;
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: "100%" },
  plain: { paddingHorizontal: 0, paddingVertical: 0 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: type.caption, lineHeight: 18, fontFamily: fonts.medium, fontWeight: "500", flexShrink: 1 },
});
