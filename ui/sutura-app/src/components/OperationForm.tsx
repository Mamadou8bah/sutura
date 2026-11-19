import { Platform } from "react-native";
import { NativeSelect, NativeButton } from "./NativeControls";
import { useState } from "react";
import { SelectionSheet } from "./SelectionSheet";
import { AppInput } from "./ui";
import { isAmountDraft } from "../utils/inputValidation";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text, NativeInput as TextInput } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "../constants/brand";
import { colors, fonts, radii, shadow, spacing } from "../theme";
import type { CustomerWallet, QuickContact } from "../types";
import { formatBalance } from "../utils/format";
import { statusLabel } from "./StatusPill";
import { tabular, type } from "../theme";
export function OperationScreen({ title, subtitle, children, }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>);
}
export function WalletPicker({ wallets, selectedId, onSelect, hidden, compact = false, }: {
    wallets: CustomerWallet[];
    selectedId: number;
    onSelect: (id: number) => void;
    hidden: boolean;
    compact?: boolean;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const selected = wallets.find(w => w.id === selectedId) ?? wallets[0];
    if (Platform.OS !== "web" && !compact) return <NativeSelect title="Wallet" value={String(selected?.id ?? "")}
      options={wallets.map(wallet => ({ value: String(wallet.id), enabled: wallet.status === "ACTIVE",
        label: `${wallet.name} · ${wallet.currency} · ${formatBalance(wallet.balance, wallet.currency, hidden)}${wallet.status === "ACTIVE" ? "" : ` · ${statusLabel(wallet.status)}`}` }))}
      onChange={value => onSelect(Number(value))} disabled={wallets.length === 0} />;
    return <><Pressable accessibilityRole="button" accessibilityLabel="Select wallet" disabled={!wallets.length} onPress={() => { setSearch(""); setOpen(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: compact ? 0 : 16, borderBottomWidth: compact ? 0 : 1, borderBottomColor: colors.border }}><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Ionicons name="wallet-outline" size={20} color={colors.slate500} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.primary, fontWeight: "600" }}>{selected?.name ?? "Choose wallet"}</Text>{!compact && <Text style={[{ color: colors.slate500, fontSize: 13 }, tabular]}>Available: {selected ? formatBalance(selected.balance, selected.currency, hidden) : "—"}</Text>}</View><Ionicons name="chevron-down" size={18} color={colors.primary}/></Pressable><SelectionSheet visible={open} title="Select wallet" onClose={() => setOpen(false)}><AppInput accessibilityLabel="Search wallets" placeholder="Search name or currency" value={search} onChangeText={setSearch}/>{wallets.filter(w => `${w.name} ${w.currency}`.toLowerCase().includes(search.toLowerCase())).map(w => <Pressable key={w.id} accessibilityRole="radio" accessibilityLabel={`${w.name}, ${w.currency}`} accessibilityState={{ checked: w.id === selectedId, disabled: w.status !== "ACTIVE" }} disabled={w.status !== "ACTIVE"} onPress={() => { onSelect(w.id); setOpen(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: w.status === "ACTIVE" ? 1 : 0.5 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>{w.name}</Text><Text style={{ color: colors.slate500, fontSize: 13 }}>{w.currency} · {w.status === "ACTIVE" ? "Available balance" : statusLabel(w.status)}</Text></View><Text style={[{ color: colors.primary }, tabular]}>{formatBalance(w.balance, w.currency, hidden)}</Text>{w.id === selectedId && <Ionicons name="checkmark" color={colors.accentText} size={20} accessibilityLabel="Selected"/>}</Pressable>)}{!wallets.some(w => `${w.name} ${w.currency}`.toLowerCase().includes(search.toLowerCase())) && <Text style={{ paddingVertical: 24, color: colors.slate500 }}>No matching wallets</Text>}</SelectionSheet></>;
}
export function AmountHero({ amount, onChange, currency, }: {
    amount: string;
    onChange: (v: string) => void;
    currency: string;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<View style={[styles.amountCard, shadow.card]}>
      <Text style={styles.amountLabel}>Amount</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amountCurrency}>{currency}</Text>
        <TextInput value={amount} onChangeText={(value) => { if (isAmountDraft(value))
        onChange(value); }} keyboardType="decimal-pad" inputMode="decimal" autoComplete="off" placeholder="0.00" accessibilityLabel={`Amount in ${currency}`} maxLength={18} placeholderTextColor={colors.slate500} style={[styles.amountInput, tabular]}/>
      </View>
    </View>);
}
export function ContactChips({ contacts, selected, onSelect, }: {
    contacts: QuickContact[];
    selected: string;
    onSelect: (phone: string) => void;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    if (contacts.length === 0)
        return null;
    return (<View style={styles.section}>
      <Text style={styles.sectionLabel}>Quick send</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {contacts.map((c) => {
            const active = selected === c.phone;
            return (<Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${c.name}, ${c.phone}`} onPress={() => onSelect(c.phone)} style={[styles.contactChip, active && styles.contactChipActive]}>
              <Text style={[styles.contactName, active && styles.contactNameActive]}>{c.name}</Text>
              <Text style={[styles.contactPhone, active && styles.contactPhoneActive]}>{c.phone}</Text>
            </Pressable>);
        })}
      </ScrollView>
    </View>);
}
export function MethodTabs<T extends string>({ options, value, onChange, }: {
    options: {
        id: T;
        label: string;
    }[];
    value: T;
    onChange: (v: T) => void;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<View accessibilityRole="tablist" style={styles.methodTabs}>
      {options.map((opt) => {
            const active = opt.id === value;
            return (<Pressable key={opt.id} accessibilityRole="tab" accessibilityLabel={opt.label} accessibilityState={{ selected: active }} onPress={() => onChange(opt.id)} style={[styles.methodTab, active && styles.methodTabActive]}>
            <Text style={[styles.methodTabText, active && styles.methodTabTextActive]}>{opt.label}</Text>
          </Pressable>);
        })}
    </View>);
}
export function FormField({ label, children, }: {
    label: string;
    children: React.ReactNode;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>);
}
export function FormInput(props: React.ComponentProps<typeof TextInput>) {
    return <AppInput {...props}/>;
}
export function FormError({ message }: {
    message?: string | null;
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    if (!message)
        return null;
    return <Text accessibilityRole="alert" style={styles.error}>{message}</Text>;
}
export function SubmitButton({ label, onPress, color = brand.orange, disabled = false, loading = false, }: {
    label: string;
    onPress: () => void;
    color?: string;
    disabled?: boolean;
    loading?: boolean;
}) {
    return <NativeButton loading={loading} label={loading ? "Processing…" : label} onPress={onPress} disabled={disabled || loading} color={color} />;
}
export function OptionList({ items, }: {
    items: {
        label: string;
        subtitle?: string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
    }[];
}) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<View style={[styles.optionList, shadow.card]}>
      {items.map((item, index) => (<Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.subtitle ? `${item.label}, ${item.subtitle}` : item.label} onPress={item.onPress} style={[styles.optionRow, index < items.length - 1 && styles.optionBorder]}>
          <View style={styles.optionIcon}>
            <Ionicons name={item.icon} size={20} color={colors.primary}/>
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionLabel}>{item.label}</Text>
            {item.subtitle ? <Text style={styles.optionSub}>{item.subtitle}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.slate400}/>
        </Pressable>))}
    </View>);
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
    scroll: { padding: spacing.screen, paddingBottom: 32, gap: spacing.gap },
    title: { fontSize: type.title, lineHeight: 34, fontFamily: fonts.semibold, fontWeight: "600", color: colors.slate900 },
    subtitle: { fontSize: 15, fontFamily: fonts.regular, color: colors.slate500, marginTop: 4 },
    banner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bannerLabel: { fontSize: 12, fontFamily: fonts.regular, color: colors.slate500 },
    bannerWallet: { flexShrink: 1, fontSize: 15, fontFamily: fonts.bold, color: colors.slate900, marginTop: 2 },
    bannerAmount: { fontSize: 18, fontFamily: fonts.bold, color: colors.slate900, flexShrink: 1, textAlign: "right" },
    section: { gap: 10 },
    sectionLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.slate500 },
    chips: { gap: 10, paddingRight: 8 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        minWidth: 130,
    },
    chipActive: { backgroundColor: colors.orangeLight, borderColor: colors.orange },
    chipName: { fontSize: 14, fontFamily: fonts.bold, color: colors.slate900 },
    chipNameActive: { color: colors.primary },
    chipBal: { fontSize: 12, fontFamily: fonts.regular, color: colors.slate500, marginTop: 4 },
    chipBalActive: { color: colors.slate700 },
    amountCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.slate500 },
    amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
    amountCurrency: { fontSize: 22, fontFamily: fonts.medium, color: colors.slate500 },
    amountInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 36,
        fontFamily: fonts.semibold,
        fontWeight: "600",
        color: colors.slate900,
        textAlign: "left",
        padding: 0,
    },
    contactChip: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 4,
    },
    contactChipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
    contactName: { fontSize: 14, fontFamily: fonts.bold, color: colors.slate900 },
    contactNameActive: { color: colors.primary },
    contactPhone: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
    contactPhoneActive: { color: colors.slate700 },
    methodTabs: {
        flexDirection: "row",
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.md,
        padding: 4,
    },
    methodTab: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },
    methodTabActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    methodTabText: { fontSize: 15, fontFamily: fonts.medium, color: colors.slate500, textAlign: "center" },
    methodTabTextActive: { color: colors.primary, fontFamily: fonts.semibold, fontWeight: "600" },
    field: { gap: 8 },
    fieldLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.slate500 },
    input: {
        minHeight: 52,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: fonts.regular,
        color: colors.slate900,
        borderWidth: 1,
        borderColor: colors.border,
    },
    error: { fontSize: 15, lineHeight: 21, fontFamily: fonts.medium, color: colors.dangerFg },
    submit: {
        minHeight: 52,
        borderRadius: radii.sm,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
    },
    submitText: { fontSize: 16, fontFamily: fonts.bold, color: "#181a20", textAlign: "center" },
    optionList: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
    },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    optionIcon: {
        width: 40,
        height: 40,
        borderRadius: radii.sm,
        backgroundColor: colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
    },
    optionBody: { flex: 1 },
    optionLabel: { fontSize: 15, fontFamily: fonts.bold, color: colors.slate900 },
    optionSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
});
