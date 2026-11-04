import { useAppFonts } from "./src/hooks/useAppFonts";
import { SafeAreaProvider, SafeAreaView as PlatformSafeAreaView } from "react-native-safe-area-context";
import { NativeNavigator } from "./src/components/NativeNavigator";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { MerchantProvider } from "./src/context/MerchantContext";
import { CollectionsScreen } from "./src/screens/CollectionsScreen";
import { WalletsScreen } from "./src/screens/WalletsScreen";
import { ActivityScreen } from "./src/screens/ActivityScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { SupportTickets } from "./src/components/SupportTickets";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { useTheme, useThemedStyles, ThemeProvider } from "./src/context/ThemeContext";
import type { ThemeColors } from "./src/theme";


import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "./src/context/AppContext";

import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PhoneScreen } from "./src/screens/registration/PhoneScreen";
import { OtpScreen } from "./src/screens/registration/OtpScreen";
import { BusinessScreen } from "./src/screens/registration/BusinessScreen";
import { OwnerScreen } from "./src/screens/registration/OwnerScreen";
import { AccountScreen } from "./src/screens/registration/AccountScreen";
import { PendingScreen } from "./src/screens/PendingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { VerificationScreen } from "./src/screens/VerificationScreen";
import { colors } from "./src/theme";
function Router({ route }: { route?: string }) {
    const { colors, mode } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { screen, loading, session, setScreen } = useApp();
    if (loading) {
        return (<View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary}/>
      </View>);
    }
    switch (route ?? screen) {
        case "welcome":
            return <WelcomeScreen />;
        case "login":
            return <LoginScreen />;
        case "reg-phone":
            return <PhoneScreen />;
        case "reg-otp":
            return <OtpScreen />;
        case "reg-business":
            return <BusinessScreen />;
        case "reg-owner":
            return <OwnerScreen />;
        case "reg-account":
            return <AccountScreen />;
        case "verification":
            return <VerificationScreen onBack={() => setScreen(session?.userStatus === "PENDING_REVIEW" ? "pending" : "home")}/>;
        case "pending":
            return <PendingScreen />;
        case "collections": return <CollectionsScreen />;
        case "wallets": return <WalletsScreen />;
        case "activity": return <ActivityScreen />;
        case "more": return <MoreScreen />;
        case "support": return <SupportTickets onBack={() => setScreen("more")}/>;
        case "settings":
            return <SettingsScreen />;
        case "home":
            return <HomeScreen />;
        default:
            return <WelcomeScreen />;
    }
}
function MerchantNav() { const { screen, setScreen, session } = useApp(); const { colors } = useTheme(); if (session?.userStatus !== "ACTIVE" || !["home", "collections", "activity", "more"].includes(screen))
    return null; return <View style={{ flexDirection: "row", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>{([['home', 'home-outline', 'Home'], ['collections', 'qr-code-outline', 'Collections'], ['activity', 'receipt-outline', 'Activity'], ['more', 'grid-outline', 'More']] as const).map(([route, icon, label]) => <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: screen === route }} key={route} onPress={() => setScreen(route)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, gap: 5 }}><Ionicons name={icon} size={23} color={screen === route ? colors.orange : colors.slate500}/><Text style={{ fontSize: 11, color: screen === route ? colors.primary : colors.slate500 }}>{label}</Text></Pressable>)}</View>; }
function MerchantScreens() {
  const { screen, setScreen, session, loading } = useApp();
  if (loading) return <Router />;
  return <View style={{flex:1}}><NativeNavigator screen={screen} scope={session?.email ?? "guest"}
    onChange={value => setScreen(value as import("./src/context/AppContext").Screen)}
    screens={["welcome","login","reg-phone","reg-otp","reg-business","reg-owner","reg-account","verification","pending","collections","wallets","activity","more","support","settings","home"]}
    renderScreen={name => <Router route={name}/>} /></View>;
}
function MainApp() {
    const { colors, mode } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<View style={styles.safeArea}>
      <StatusBar style={mode === "dark" ? "light" : "dark"}/>
      <MerchantScreens /><MerchantNav />
    </View>);
}
function ThemedApp() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary}/></View>;
  return <AppProvider><MerchantProvider><MainApp /></MerchantProvider></AppProvider>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: { flex: 1, minHeight: 0, height: "100%", width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: colors.background },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
export default function App() { return <SafeAreaProvider><ThemeProvider><AppFrame /></ThemeProvider></SafeAreaProvider>; }

function AppFrame() {
  const { colors } = useTheme();
  return <PlatformSafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}><ThemedApp /></PlatformSafeAreaView>;
}
