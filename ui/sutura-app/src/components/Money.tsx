import type { StyleProp, TextStyle } from "react-native";
import { NativeText as Text } from "./NativeControls";
import { tabular } from "../theme";
import { formatMoney } from "../utils/format";

/**
 * One money text for every amount (identical copies in all three apps).
 * en-GB grouping, 2 decimals (up to 4 when asked), the currency code always
 * visible, tabular figures, and wrapping instead of shrinking under large text.
 * The currency always comes from the wallet or operation; amounts in different
 * currencies are never summed.
 */
export function Money({ amount, currency, hidden = false, sign, maxFractionDigits = 2, style, numberOfLines }: {
  amount: number;
  currency: string;
  hidden?: boolean;
  sign?: "+" | "−" | "";
  maxFractionDigits?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const text = hidden ? `${currency} ••••••` : `${sign ?? ""}${formatMoney(amount, currency, maxFractionDigits)}`;
  return <Text numberOfLines={numberOfLines} accessibilityLabel={hidden ? `${currency} balance hidden` : undefined}
    style={[tabular, style]}>{text}</Text>;
}
