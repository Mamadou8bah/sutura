import { useState } from "react";
import { Share, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Screen, AppInput } from "../components/ui";
import { Heading, DataNotice, Empty, money } from "../components/MerchantUI";
import { Money } from "../components/Money";
import { StatusPill, statusLabel } from "../components/StatusPill";
import { SkeletonRows } from "../components/Skeleton";
import { SecondaryButton } from "../components/Review";
import { SelectionSheet } from "../components/SelectionSheet";
import { useMerchant } from "../context/MerchantContext";
import { useTheme } from "../context/ThemeContext";
import type { Payment } from "../api/operations";
import { fonts, type } from "../theme";
import { formatTimestamp } from "../utils/format";

const filters = ["All", "Incoming", "Outgoing"] as const;

export function ActivityScreen() {
  const { colors } = useTheme();
  const { transactions, wallets, hidden, loaded } = useMerchant();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const owned = new Set(wallets.map(w => w.id));
  const incoming = (p: Payment) => p.destinationWalletId ? owned.has(p.destinationWalletId) : p.type === "DEPOSIT";
  const byFilter = transactions.filter(t => filter === "All" || (filter === "Incoming" && incoming(t)) || (filter === "Outgoing" && !incoming(t)));
  const rows = byFilter.filter(t => `${t.reference} ${t.description ?? ""} ${t.currency}`.toLowerCase().includes(query.toLowerCase()));
  const searching = query.trim().length > 0;
  return <Screen>
    <Heading title="Activity" subtitle="Business payments and their status." />
    <DataNotice />
    <AppInput accessibilityLabel="Search payments" placeholder="Search reference or description" value={query} onChangeText={setQuery} maxLength={100} />
    <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {filters.map(f => <Pressable accessibilityRole="tab" accessibilityLabel={`${f} payments`} accessibilityState={{ selected: f === filter }} key={f} onPress={() => setFilter(f)}
        style={{ minHeight: 44, justifyContent: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: f === filter ? colors.orange : "transparent" }}>
        <Text style={{ fontSize: type.body, fontFamily: f === filter ? fonts.semibold : fonts.medium, fontWeight: f === filter ? "600" : "500", color: f === filter ? colors.primary : colors.slate500 }}>{f}</Text>
      </Pressable>)}
    </View>
    {!loaded ? <SkeletonRows rows={5} label="Loading payments" /> : rows.map(t => {
      const credit = incoming(t);
      return <Pressable accessibilityRole="button" accessibilityLabel={`${t.description || statusLabel(t.type)}, ${credit ? "incoming" : "outgoing"}, ${statusLabel(t.status)}`} key={t.id}
        onPress={() => { setError(""); setSelected(t); }} style={{ paddingVertical: 14, borderBottomWidth: 0, borderBottomColor: colors.border, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body, flexShrink: 1 }}>{t.description || statusLabel(t.type)}</Text>
          <Money amount={t.amount} currency={t.currency} hidden={hidden} sign={credit ? "+" : "−"} style={{ color: colors.primary, fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <StatusPill status={t.status} />
          <Text style={{ color: colors.slate500, fontSize: type.caption }}>{formatTimestamp(t.createdAt)}</Text>
        </View>
      </Pressable>;
    })}
    {loaded && !rows.length && (searching
      ? <Empty title="No matching payments" hint="Try another reference or description." />
      : <Empty title="No payments yet" hint="Payments you receive or send appear here." />)}
    <SelectionSheet visible={!!selected} title="Payment details" onClose={() => setSelected(null)}>
      {selected && <View style={{ gap: 16 }}>
        <Money amount={selected.amount} currency={selected.currency} hidden={hidden} style={{ color: colors.primary, fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.title }} />
        <StatusPill status={selected.status} />
        {[["Type", statusLabel(selected.type)], ["Reference", selected.reference], ["Date", formatTimestamp(selected.createdAt)], ["Description", selected.description || "—"]].map(([label, value]) =>
          <View key={label} style={{ gap: 4 }}>
            <Text style={{ color: colors.slate500, fontSize: type.caption }}>{label}</Text>
            <Text selectable style={{ color: colors.primary, fontSize: type.body }}>{value}</Text>
          </View>)}
        <SecondaryButton label="Share payment details" onPress={() => {
          Share.share({ message: `Sutura payment\n${selected.reference}\n${statusLabel(selected.status)}\n${money(selected.amount, selected.currency)}\n${formatTimestamp(selected.createdAt)}` }).catch(() => setError("Could not share payment details."));
        }} />
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerFg }}>{error}</Text>}
      </View>}
    </SelectionSheet>
  </Screen>;
}
