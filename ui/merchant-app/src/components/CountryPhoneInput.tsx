import { CountryFlag } from "./CountryFlag";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeInput, NativePressable, NativeText as Text } from "./NativeControls";
import { AppInput } from "./ui";
import { SelectionSheet } from "./SelectionSheet";
import { useTheme } from "../context/ThemeContext";
import { countryForPhone, internationalPhoneDraft, nationalPhoneDraft, searchPhoneCountries, type PhoneCountry } from "../utils/countryPhone";

/** Emits international drafts; submitters must call normalizeCountryPhone. */
export function CountryPhoneInput({ value, onChangeText, disabled = false, allowedCountries }: {
  value: string; onChangeText: (value: string) => void; disabled?: boolean; allowedCountries?: readonly string[];
}) {
  const { colors } = useTheme();
  const [country, setCountry] = useState(() => countryForPhone(value));
  const [national, setNational] = useState(() => nationalPhoneDraft(value, countryForPhone(value)));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const lastEmitted = useRef(value);
  const input = useRef<NativeInput>(null);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      const next = countryForPhone(value, country.iso);
      setCountry(next); setNational(nationalPhoneDraft(value, next)); lastEmitted.current = value;
    }
  }, [value, country.iso]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  function emit(text: string, selected: PhoneCountry) {
    const next = internationalPhoneDraft(text, selected.iso);
    lastEmitted.current = next; onChangeText(next);
  }
  function select(next: PhoneCountry) {
    setCountry(next); emit(national, next); setOpen(false); setSearch("");
    requestAnimationFrame(() => input.current?.focus());
  }
  const fixed = allowedCountries?.length === 1;
  const rows = searchPhoneCountries(search, allowedCountries).sort((a, b) => Number(b.iso === country.iso) - Number(a.iso === country.iso));
  return <View style={{ gap: 8 }}>
    <View style={[styles.field, { backgroundColor: colors.surfaceMuted, borderColor: focused ? colors.accentText : colors.border }]}>
      <NativePressable accessibilityRole="button" accessibilityLabel={`Country code, ${country.name}, +${country.dial}`}
        accessibilityHint={fixed ? "Registration supports this country only" : "Choose a country or calling code"}
        accessibilityState={{ disabled: disabled || fixed, expanded: open }} disabled={disabled || fixed}
        onPress={() => { Keyboard.dismiss(); setSearch(""); setOpen(true); }}
        style={[styles.selector, { borderColor: colors.border }]}>
        <CountryFlag iso={country.iso} />
        <Text style={{ fontSize: 16, color: colors.primary, fontVariant: ["tabular-nums"] }}>+{country.dial}</Text>
        {!fixed && <Ionicons name="chevron-down" size={14} color={colors.slate500} />}
      </NativePressable>
      <NativeInput ref={input} accessibilityLabel="Phone number" accessibilityHint={`Enter your number in ${country.name}; +${country.dial} is selected`}
        value={national} onChangeText={text => {
          if (!/^\+?[\d\s().-]*$/.test(text) || text.length > 40) return;
          if (text.startsWith("+") || text.startsWith("00")) {
            const next = countryForPhone(text, country.iso);
            if (allowedCountries && !allowedCountries.includes(next.iso)) return;
            setCountry(next); setNational(nationalPhoneDraft(text, next)); emit(text, next);
          } else { setNational(text); emit(text, country); }
        }}
        editable={!disabled} keyboardType="phone-pad" inputMode="tel" autoComplete="tel-national" autoCorrect={false}
        maxLength={40} placeholder={country.iso === "GM" ? "328 1914" : "Phone number"} placeholderTextColor={colors.slate500}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: colors.primary }} />
    </View>
    <SelectionSheet visible={open && !disabled} title="Country or region" onClose={() => { setOpen(false); setSearch(""); requestAnimationFrame(() => input.current?.focus()); }}>
      <AppInput accessibilityLabel="Search countries" placeholder="Search country or calling code" value={search}
        onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      <View accessibilityRole="radiogroup" accessibilityLabel="Country calling codes" style={{ marginTop: 12 }}>
        {rows.map(row => <NativePressable key={row.iso} accessibilityRole="radio"
          accessibilityLabel={`${row.name}, +${row.dial}`} accessibilityState={{ checked: row.iso === country.iso }}
          onPress={() => select(row)} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
          <CountryFlag iso={row.iso} />
          <Text style={{ flex: 1, minWidth: 0, fontSize: 16, color: colors.primary }}>{row.name}</Text>
          <Text style={{ color: colors.slate500, fontSize: 15 }}>+{row.dial}</Text>
          {row.iso === country.iso && <Ionicons name="checkmark" size={20} color={colors.accentText} />}
        </NativePressable>)}
        {!rows.length && <Text accessibilityLiveRegion="polite" style={{ color: colors.slate500, paddingVertical: 20 }}>No countries found. Try a name or calling code.</Text>}
      </View>
    </SelectionSheet>
  </View>;
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, minHeight: 54 },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    minWidth: 108, minHeight: 52, paddingHorizontal: 10, paddingVertical: 10, borderRightWidth: StyleSheet.hairlineWidth },
});
