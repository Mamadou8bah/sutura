import { SettingsScreen } from "./src/screens/SettingsScreen";
import {useTheme,useThemedStyles,ThemeProvider} from "./src/context/ThemeContext";
import type {ThemeColors} from "./src/theme";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, SafeAreaView, StyleSheet, View, Platform, StatusBar as NativeStatusBar } from "react-native";
import { BottomNav } from "./src/components/BottomNav";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AgentProvider, navTabFor, useAgent } from "./src/context/AgentContext";
import { applyFontDefaults } from "./src/setupFonts";
import { ActivityScreen } from "./src/screens/ActivityScreen";
import { ConfirmScreen } from "./src/screens/ConfirmScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { NewDepositScreen } from "./src/screens/NewDepositScreen";
import { NewWithdrawalScreen } from "./src/screens/NewWithdrawalScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { QueueScreen } from "./src/screens/QueueScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import { SupportScreen } from "./src/screens/SupportScreen";
import { colors } from "./src/theme";
import type { TabId } from "./src/types";

const mainTabs = new Set<TabId>(["home", "scan", "queue", "activity", "more"]);

function MainApp() {
 const {colors,mode}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { tab, setTab } = useAgent();
  const showNav = mainTabs.has(tab);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={styles.body}>
        {tab === "home" && <HomeScreen />}
        {tab === "scan" && <ScanScreen />}
        {tab === "queue" && <QueueScreen />}
        {tab === "activity" && <ActivityScreen />}
        {tab === "more" && <MoreScreen />}
        {tab === "confirm" && <ConfirmScreen />}
        {tab === "new-deposit" && <NewDepositScreen />}
        {tab === "new-withdrawal" && <NewWithdrawalScreen />}
        {tab === "profile" && <ProfileScreen />}
        {tab === "settings" && <SettingsScreen />}
        {tab === "support" && <SupportScreen />}
      </View>

      {showNav ? <BottomNav active={navTabFor(tab)} onChange={setTab} /> : null}
    </SafeAreaView>
  );
}

function Root() {
 const {colors,mode}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!session) {
    return <LoginScreen />;
  }
  return (
    <AgentProvider>
      <MainApp />
    </AgentProvider>
  );
}

function ThemedApp() {
 const {colors,mode}=useTheme();
 const styles=useThemedStyles(createStyles);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"}/>
      <Root />
    </AuthProvider>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, minHeight: 0, height: "100%", width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: colors.background },
  body: { flex: 1, minHeight: 0 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});

export default function App(){return <ThemeProvider><AppFrame /></ThemeProvider>;}

function AppFrame() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0 }}><ThemedApp /></View>;
}
