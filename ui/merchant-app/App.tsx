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
import { Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_600SemiBold, useFonts, } from "@expo-google-fonts/inter";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View, Platform, StatusBar as NativeStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "./src/context/AppContext";
import { applyFontDefaults } from "./src/setupFonts";
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
function Router() {
    const { colors, mode } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { screen, loading, session, setScreen } = useApp();
    if (loading) {
        return (<View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary}/>
      </View>);
    }
    switch (screen) {
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
function MainApp() {
    const { colors, mode } = useTheme();
    const styles = useThemedStyles(createStyles);
    return (<SafeAreaView style={styles.safeArea}>
      <StatusBar style={mode === "dark" ? "light" : "dark"}/>
      <Router /><MerchantNav />
    </SafeAreaView>);
}
function ThemedApp() {
    const { colors, mode } = useTheme();
    const styles = useThemedStyles(createStyles);
    const [fontsLoaded, fontError] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_700Bold,
        Inter_600SemiBold,
    });
    const fontsApplied = useRef(false);
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setFontTimedOut(true), 8000); return () => clearTimeout(timer); }, []);
    useEffect(() => {
        if (fontsLoaded && !fontsApplied.current) {
            applyFontDefaults();
            fontsApplied.current = true;
        }
    }, [fontsLoaded]);
    if (!fontsLoaded && !fontError && !fontTimedOut) {
        return (<View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary}/>
      </View>);
    }
    return (<AppProvider>
      <MerchantProvider><MainApp /></MerchantProvider>
    </AppProvider>);
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
    safeArea: { flex: 1, minHeight: 0, height: "100%", width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: colors.background },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
export default function App() { return <ThemeProvider><AppFrame /></ThemeProvider>; }

function AppFrame() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0 }}><ThemedApp /></View>;
}
