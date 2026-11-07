import { useTheme, useThemedStyles } from "../context/ThemeContext";
import type { ThemeColors } from "../theme";
import { useState } from "react";
import { FlatList, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "./NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { brand } from "../constants/brand";
import { useWallet } from "../context/WalletContext";
import { colors, fonts, radii, shadow } from "../theme";
import type { CustomerWallet } from "../types";
import { formatBalance } from "../utils/format";
import { SuturaLogo } from "./SuturaLogo";
import { WalletCardArt } from "./WalletCardArt";

const cardThemes: Record<
  CustomerWallet["kind"],
  { gradient: [string, string, string]; accent: string; label: string }
> = {
  primary: {
    gradient: [brand.blackSoft, brand.black, "#000000"],
    accent: brand.orange,
    label: "Primary",
  },
  savings: {
    gradient: ["#1a2332", brand.blackSoft, brand.black],
    accent: brand.orange,
    label: "Savings",
  },
  secondary: {
    gradient: [brand.charcoal, brand.blackSoft, brand.black],
    accent: brand.orangeBright,
    label: "Secondary",
  },
};

export function WalletCarousel({
  wallets,
  selectedId,
}: {
  wallets: CustomerWallet[];
  selectedId: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { openWalletActions } = useWallet();
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(Math.min(600, width - 40));
  const cardWidth = availableWidth;

  return (
    <FlatList<CustomerWallet>
      horizontal
      onLayout={(event: LayoutChangeEvent) => setAvailableWidth(event.nativeEvent.layout.width)}
      data={wallets}
      keyExtractor={(item) => String(item.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      snapToInterval={cardWidth + 12}
      decelerationRate="fast"
      renderItem={({ item }: { item: CustomerWallet }) => (
        <WalletSlide
          wallet={item}
          width={cardWidth}
          active={item.id === selectedId}
          onPress={() => openWalletActions(item.id)}
        />
      )}
    />
  );
}

function BalanceToggle({
  amount,
  currency,
  hidden,
  onToggle,
  variant,
}: {
  amount: number;
  currency: string;
  hidden: boolean;
  onToggle: () => void;
  variant: "carousel" | "list";
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isCarousel = variant === "carousel";

  return (
    <View style={isCarousel ? styles.balanceRow : styles.listBalanceRow}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={isCarousel ? styles.balance : styles.listBalance}>
        {formatBalance(amount, currency, hidden)}
      </Text>
      <Pressable
        onPress={(event) => { event.stopPropagation(); onToggle(); }}
        hitSlop={10}
        style={isCarousel ? styles.eyeBtn : styles.listEyeBtn}
        accessibilityLabel={hidden ? "Show balance" : "Hide balance"}
      >
        <Ionicons
          name={hidden ? "eye-off-outline" : "eye-outline"}
          size={isCarousel ? 20 : 18}
          color={isCarousel ? colors.primary : colors.slate500}
        />
      </Pressable>
    </View>
  );
}

function WalletSlide({
  wallet,
  width,
  active,
  onPress,
}: {
  wallet: CustomerWallet;
  width: number;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { balanceHidden, toggleBalanceHidden } = useWallet();
  const shortId = String(wallet.id).slice(-4);
  const theme = cardThemes[wallet.kind];

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${wallet.name} wallet actions`} onPress={onPress} style={[styles.cardOuter, { width }, active && styles.cardOuterActive]}>
      <View style={styles.card}>

        <View style={styles.cardInner}>
          <View style={styles.top}>
            <SuturaLogo size={44} />
            <View style={styles.topRight}>
              <Text style={styles.kind}>{theme.label}</Text>
              <Text style={styles.digits}>Wallet #{shortId}</Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>Available balance</Text>
          <BalanceToggle
            amount={wallet.balance}
            currency={wallet.currency}
            hidden={balanceHidden}
            onToggle={toggleBalanceHidden}
            variant="carousel"
          />

          <Text style={styles.tapHint}>Manage wallet  →</Text>


        </View>

      </View>
    </Pressable>
  );
}

export function WalletListCard({ wallet }: { wallet: CustomerWallet }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { balanceHidden, toggleBalanceHidden, openWalletActions } = useWallet();
  const theme = cardThemes[wallet.kind];
  return <Pressable accessibilityRole="button" accessibilityLabel={`${wallet.name} wallet actions`} onPress={() => openWalletActions(wallet.id)} style={[styles.listCard, shadow.card]}>
    <View style={styles.listArtPanel}>
      <LinearGradient colors={[theme.gradient[0], theme.gradient[2]]} style={styles.listGradient}>
        <WalletCardArt variant="compact" />
        <SuturaLogo size={36} />
      </LinearGradient>
    </View>
    <View style={styles.listBody}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text numberOfLines={1} style={[styles.listName, { flex: 1 }]}>{wallet.name}</Text>
        <Text style={[styles.listStatus, { color: colors.slate700 }]}>{wallet.status}</Text>
      </View>
      <Text style={styles.listMeta}>{wallet.currency} · Wallet #{wallet.id}</Text>
      <View style={{ marginTop: 8 }}>
        <BalanceToggle amount={wallet.balance} currency={wallet.currency} hidden={balanceHidden} onToggle={toggleBalanceHidden} variant="list" />
      </View>
    </View>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  list: { paddingVertical: 4 },
  cardOuter: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 12,
    overflow: "hidden",
  },
  cardOuterActive: {
    borderColor: colors.orange,
  },
  card: {
    minHeight: 176,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
    padding: 20,
    zIndex: 1,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 2,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  topRight: { alignItems: "flex-end" },
  kind: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: brand.orange,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  digits: {
    color: colors.slate500,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  balanceLabel: { color: colors.slate500, fontFamily: fonts.medium, fontSize: 12, marginTop: 16 },
  status: { color: colors.primary, backgroundColor: colors.orangeLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontFamily: fonts.medium, fontSize: 11 },
  balance: {
    color: colors.primary,
    fontSize: 24,
    fontFamily: fonts.black,
    letterSpacing: -0.5,
    flex: 1,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  tapHint: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.slate500,
    marginTop: 4,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  bottomBlock: { gap: 4, flex: 1, minWidth: 0 },
  bottomRight: { alignItems: "flex-end" },
  label: {
    color: colors.slate500,
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listArtPanel: {
    width: 48,
    alignSelf: "stretch",
    minHeight: 116,
  },
  listGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  listBody: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 12 },
  listName: { fontSize: 16, fontFamily: fonts.bold, color: colors.slate900 },
  listMeta: { fontSize: 13, fontFamily: fonts.regular, color: colors.slate500, marginTop: 2 },
  listRight: { alignItems: "flex-end", maxWidth: "54%", paddingRight: 12 },
  listBalanceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  listBalance: { fontSize: 15, fontFamily: fonts.bold, color: colors.slate900 },
  listEyeBtn: { padding: 4 },
  listStatus: { fontSize: 11, fontFamily: fonts.medium, marginTop: 2 },
});
