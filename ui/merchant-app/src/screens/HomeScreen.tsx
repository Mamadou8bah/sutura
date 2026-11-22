import { WalletSurface } from "../components/WalletSurface";
import { RefreshControl, View } from "react-native";
import { NativePressable as Pressable, NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import { Screen, SuturaLogo, LinkButton } from "../components/ui";
import { ActionIcon } from "../components/ActionIcon";
import { Money } from "../components/Money";
import { StatusPill, statusLabel, statusTone } from "../components/StatusPill";
import { SkeletonBalance, SkeletonRows } from "../components/Skeleton";
import { useApp } from "../context/AppContext";
import { useMerchant } from "../context/MerchantContext";
import { useTheme } from "../context/ThemeContext";
import { fonts, type } from "../theme";
import { formatTimestamp } from "../utils/format";

/** Shown instead of Home when the account is suspended, closed or rejected. */
function BlockedAccount({ status }: { status: string }) {
  const { colors } = useTheme();
  const { signOut, setScreen } = useApp();
  return <Screen>
    <View style={{ gap: 12, paddingTop: 24 }}>
      <SuturaLogo size={48} />
      <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.title, lineHeight: 34, color: colors.primary }}>Payments are paused</Text>
      <StatusPill status={status} />
      <Text style={{ color: colors.slate500, fontSize: type.body, lineHeight: 22 }}>
        This business account is {statusLabel(status).toLowerCase()}, so it cannot collect payments. Contact Sutura support to find out why and what to do next.
      </Text>
    </View>
    <LinkButton label="Contact support" onPress={() => setScreen("support")} />
    <LinkButton label="Sign out" onPress={() => void signOut()} />
  </Screen>;
}

export function HomeScreen() {
  const { colors } = useTheme();
  const { session, setScreen } = useApp();
  const { wallets, selectedId, hidden, setHidden, transactions, collections, loaded, refresh, loading, updatedAt, error } = useMerchant();
  if (session && session.userStatus !== "ACTIVE" && statusTone(session.userStatus) === "danger") return <BlockedAccount status={session.userStatus} />;
  const wallet = wallets.find(w => w.id === selectedId);
  const firstLoad = !loaded;
  const openCount = collections.filter(c => c.status === "ACTIVE").length;
  const reviewCount = collections.filter(c => c.status === "REVIEW").length;
  return <Screen refreshControl={<RefreshControl refreshing={loading && loaded} onRefresh={() => void refresh()}
    tintColor={colors.slate500} colors={[colors.orange]} />}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <SuturaLogo />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, fontSize: type.headline }}>{session?.businessName || "Your business"}</Text>

      </View>
    </View>
    <WalletSurface>
      {firstLoad ? <SkeletonBalance /> : <>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: type.body, color: colors.walletMuted }}>{wallet ? "Available balance" : "Balance"}</Text>
          {wallet && <Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Show balance" : "Hide balance"} onPress={() => setHidden(!hidden)} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
          </Pressable>}
        </View>
        {wallet && wallet.balance != null ? <Money amount={wallet.balance} currency={wallet.currency} hidden={hidden}
          style={{ fontFamily: fonts.semibold, fontWeight: "600", fontSize: type.display, lineHeight: 46, color: colors.walletInk }} />
          : <Text style={{ color: colors.walletMuted, fontSize: type.body }}>{wallet || (!updatedAt && error) ? "Balance unavailable" : "No business wallet yet."}</Text>}

      </>}
    </WalletSurface>
    <Pressable accessibilityRole="button" onPress={() => setScreen("collections")}
      style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <ActionIcon name="qr" size={48} />
      <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: type.body, color: colors.primary }}>Create payment QR</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.accentText} />
    </Pressable>
    {!firstLoad && (openCount > 0 || reviewCount > 0) && <Pressable accessibilityRole="button" accessibilityLabel="View open payment requests"
      onPress={() => setScreen("collections")} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1, color: colors.slate500, fontSize: type.body }}>
        {[openCount > 0 ? `${openCount} unpaid ${openCount === 1 ? "request" : "requests"}` : "", reviewCount > 0 ? `${reviewCount} under review` : ""].filter(Boolean).join(", ")}
      </Text><Ionicons name="chevron-forward" size={16} color={colors.slate500} />
    </Pressable>}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontWeight: "600", color: colors.primary, fontSize: type.section, flexShrink: 1 }}>Recent payments</Text>
      {transactions.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="View all payments" onPress={() => setScreen("activity")} style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 48 }}>
        <Text style={{ color: colors.accentText, fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500" }}>View all</Text>
      </Pressable>}
    </View>
    {firstLoad ? <SkeletonRows rows={3} label="Loading payments" /> : transactions.length > 0 && <View style={{ backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12 }}>{transactions.slice(0, 4).map(t =>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.description || "Payment"}, ${statusLabel(t.status)}. Open activity`} key={t.id} onPress={() => setScreen("activity")}
        style={{ paddingVertical: 14, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <Text style={{ color: colors.primary, fontFamily: fonts.medium, fontWeight: "500", fontSize: type.body, flexShrink: 1 }}>{t.description || statusLabel(t.type)}</Text>
          <Money amount={t.amount} currency={t.currency} hidden={hidden} style={{ color: colors.primary, fontSize: type.body, fontFamily: fonts.medium, fontWeight: "500" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusPill status={t.status} />
          <Text style={{ color: colors.slate500, fontSize: type.caption }}>{formatTimestamp(t.createdAt)}</Text>
        </View>
      </Pressable>)}</View>}
    {loaded && !transactions.length && <View style={{ paddingVertical: 20, gap: 6 }}><Text style={{ fontSize: type.headline, color: colors.primary, fontWeight: "600" }}>No payments yet</Text><Text style={{ fontSize: type.caption, color: colors.slate500, lineHeight: 19 }}>Payments you receive will appear here.</Text></View>}
  </Screen>;
}
