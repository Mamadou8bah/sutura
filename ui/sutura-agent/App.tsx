import { useAppFonts } from "./src/hooks/useAppFonts";
import { SafeAreaProvider, SafeAreaView as PlatformSafeAreaView } from "react-native-safe-area-context";
import { NativeNavigator } from "./src/components/NativeNavigator";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import {useTheme,useThemedStyles,ThemeProvider} from "./src/context/ThemeContext";
import type {ThemeColors} from "./src/theme";


import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { BottomNav } from "./src/components/BottomNav";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AgentProvider, navTabFor, useAgent } from "./src/context/AgentContext";

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
    <View style={styles.safeArea}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={styles.body}>
        <NativeNavigator screen={tab} onChange={value => setTab(value as TabId)}
          screens={["home", "scan", "queue", "activity", "more", "confirm", "new-deposit", "new-withdrawal", "profile", "settings", "support"]} renderScreen={name => {
          switch (name) {
            case "home": return <HomeScreen />;
            case "scan": return <ScanScreen />;
            case "queue": return <QueueScreen />;
            case "activity": return <ActivityScreen />;
            case "more": return <MoreScreen />;
            case "confirm": return <ConfirmScreen />;
            case "new-deposit": return <NewDepositScreen />;
            case "new-withdrawal": return <NewWithdrawalScreen />;
            case "profile": return <ProfileScreen />;
            case "settings": return <SettingsScreen />;
            case "support": return <SupportScreen />;
            default: return <HomeScreen />;
          }
        }} />
      </View>

      {showNav ? <BottomNav active={navTabFor(tab)} onChange={setTab} /> : null}
    </View>
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
    return <PlatformSafeAreaView edges={["top"]} style={{flex:1}}><LoginScreen /></PlatformSafeAreaView>;
  }
  return (
    <AgentProvider key={session.username}>
      <MainApp />
    </AgentProvider>
  );
}

function ThemedApp() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary}/></View>;
  return <AuthProvider><StatusBar style={mode === "dark" ? "light" : "dark"}/><Root /></AuthProvider>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, minHeight: 0, height: "100%", width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: colors.background },
  body: { flex: 1, minHeight: 0 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});

export default function App(){return <SafeAreaProvider><ThemeProvider><AppFrame /></ThemeProvider></SafeAreaProvider>;}

function AppFrame() {
  const { colors } = useTheme();
  return <PlatformSafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}><ThemedApp /></PlatformSafeAreaView>;
}
