import { LinearGradient } from "expo-linear-gradient";
import { DeviceLockProvider } from "./src/context/DeviceLockContext";
import { FirstLaunchGate } from "./src/components/FirstLaunchGate";
import { CreateWalletScreen } from "./src/screens/CreateWalletScreen";
import { useAppFonts } from "./src/hooks/useAppFonts";
import { SafeAreaProvider, SafeAreaView as PlatformSafeAreaView } from "react-native-safe-area-context";
import { NativeNavigator } from "./src/components/NativeNavigator";
import { ScanScreen } from "./src/screens/ScanScreen";
import { useTheme, useThemedStyles, ThemeProvider } from "./src/context/ThemeContext";
import type { ThemeColors } from "./src/theme";




import { StatusBar } from "expo-status-bar";

import { ActivityIndicator, StyleSheet, View } from "react-native";

import { BottomNav } from "./src/components/BottomNav";

import { WalletActionsSheet } from "./src/components/WalletActionsSheet";

import { TransactionDetailSheet } from "./src/components/TransactionDetailSheet";

import { AuthProvider, useAuth } from "./src/context/AuthContext";

import { WalletProvider, useWallet } from "./src/context/WalletContext";



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



const transparentScreens = new Set(["home"]);
const customHeaders = new Set(["profile", "topup"]);
const mainTabs = new Set<TabId>(["home", "wallets", "activity", "more", "profile"]);



function MainApp() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);


  const { tab, setTab } = useWallet();

  const showNav = mainTabs.has(tab);



  return (

    <View style={styles.safeArea}>

      {tab === "home" && <LinearGradient colors={[colors.background, colors.walletHighlight, colors.walletSurface]}
        locations={[0, 0.48, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />}
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <View style={styles.body}>
        <NativeNavigator transparentScreens={transparentScreens} customHeaders={customHeaders} screen={tab} onChange={value => setTab(value as TabId)}
          screens={["home", "wallets", "create-wallet", "scan", "send", "activity", "more", "topup", "withdraw", "support", "profile", "verification"]} renderScreen={name => {
          switch (name) {
            case "home": return <HomeScreen />;
            case "wallets": return <WalletsScreen />;
            case "create-wallet": return <CreateWalletScreen />;
            case "scan": return <ScanScreen />;
            case "send": return <SendScreen />;
            case "activity": return <ActivityScreen />;
            case "more": return <MoreScreen />;
            case "topup": return <TopUpScreen />;
            case "withdraw": return <WithdrawScreen />;
            case "support": return <SupportScreen />;
            case "profile": return <ProfileScreen />;
            case "verification": return <VerificationScreen onBack={() => setTab("profile")} />;
            default: return <HomeScreen />;
          }
        }} />
      </View>



      {showNav ? <BottomNav active={tab} onChange={setTab} /> : null}

      <WalletActionsSheet />

      <TransactionDetailSheet />

    </View>

  );

}



function Root() {
  const { colors, mode } = useTheme();
  const styles = useThemedStyles(createStyles);


  const { session, loading, signOut } = useAuth();

  if (loading) {

    return (

      <View style={styles.loading}>

        <ActivityIndicator size="large" color={colors.primary} />

      </View>

    );

  }

  if (!session) {

    return <FirstLaunchGate app="customer"><PlatformSafeAreaView edges={["top"]} style={{flex:1}}><LoginScreen /></PlatformSafeAreaView></FirstLaunchGate>;

  }

  return (

    <FirstLaunchGate app="customer" authenticated><DeviceLockProvider scope={`customer:${session.username}`} onSignOut={signOut}><WalletProvider key={session.username}>

      <MainApp />

    </WalletProvider></DeviceLockProvider></FirstLaunchGate>

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

export default function App() { return <SafeAreaProvider><ThemeProvider><AppFrame /></ThemeProvider></SafeAreaProvider>; }

function AppFrame() {
  const { colors } = useTheme();
  return <PlatformSafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}><ThemedApp /></PlatformSafeAreaView>;
}
