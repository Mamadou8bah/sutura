import { ScanScreen } from "./src/screens/ScanScreen";
import { useTheme, useThemedStyles, ThemeProvider } from "./src/context/ThemeContext";
import type { ThemeColors } from "./src/theme";
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

import { WalletActionsSheet } from "./src/components/WalletActionsSheet";

import { TransactionDetailSheet } from "./src/components/TransactionDetailSheet";

import { AuthProvider, useAuth } from "./src/context/AuthContext";

import { WalletProvider, navTabFor, useWallet } from "./src/context/WalletContext";

import { applyFontDefaults } from "./src/setupFonts";

import { ActivityScreen } from "./src/screens/ActivityScreen";

import { HomeScreen } from "./src/screens/HomeScreen";

import { LoginScreen } from "./src/screens/LoginScreen";

import { MoreScreen } from "./src/screens/MoreScreen";

import { VerificationScreen } from "./src/screens/VerificationScreen";

import { ProfileScreen } from "./src/screens/ProfileScreen";

import { SendScreen } from "./src/screens/SendScreen";

import { SupportScreen } from "./src/screens/SupportScreen";

import { TopUpScreen } from "./src/screens/TopUpScreen";

import { WalletsScreen } from "./src/screens/WalletsScreen";

import { WithdrawScreen } from "./src/screens/WithdrawScreen";

import { colors } from "./src/theme";

import type { TabId } from "./src/types";



const mainTabs = new Set<TabId>(["home", "wallets", "scan", "send", "activity", "more"]);



function MainApp() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);


  const { tab, setTab } = useWallet();

  const showNav = mainTabs.has(tab);



  return (

    <SafeAreaView style={styles.safeArea}>

      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <View style={styles.body}>

        {tab === "home" && <HomeScreen />}

        {tab === "wallets" && <WalletsScreen />}

        {tab === "scan" && <ScanScreen />}
        {tab === "send" && <SendScreen />}

        {tab === "activity" && <ActivityScreen />}

        {tab === "more" && <MoreScreen />}

        {tab === "topup" && <TopUpScreen />}

        {tab === "withdraw" && <WithdrawScreen />}

        {tab === "support" && <SupportScreen />}

        {tab === "profile" && <ProfileScreen />}

        {tab === "verification" && <VerificationScreen onBack={() => setTab("profile")} />}

      </View>



      {showNav ? <BottomNav active={navTabFor(tab)} onChange={setTab} /> : null}

      <WalletActionsSheet />

      <TransactionDetailSheet />

    </SafeAreaView>

  );

}



function Root() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);


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

    <WalletProvider>

      <MainApp />

    </WalletProvider>

  );

}



function ThemedApp() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);


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

      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Root />

    </AuthProvider>

  );

}



const createStyles = (colors: ThemeColors) => StyleSheet.create({

  safeArea: { flex: 1, minHeight: 0, height: "100%", width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: colors.background },

  body: { flex: 1, minHeight: 0 },

  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },

});

export default function App() { return <ThemeProvider><AppFrame /></ThemeProvider>; }

function AppFrame() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0 }}><ThemedApp /></View>;
}
