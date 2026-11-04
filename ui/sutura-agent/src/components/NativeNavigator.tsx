import { SafeAreaView } from "react-native-safe-area-context";
import { NativeHeaderContext } from "./NativeControls";
import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import { NavigationContainer, createNavigationContainerRef, StackActions, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";

const Stack = createNativeStackNavigator();
const headerScreens = new Set(["profile", "support", "topup", "withdraw", "settings", "new-deposit", "new-withdrawal", "confirm"]);
const titles: Record<string, string> = { profile: "Account", support: "Support", topup: "Top up", withdraw: "Withdraw",
  settings: "Settings", "new-deposit": "Cash in", "new-withdrawal": "Cash out", confirm: "Confirm operation" };
export function NativeNavigator({ screen, onChange, screens, renderScreen, scope = "default" }: {
  screen: string; onChange: (screen: string) => void; screens: readonly string[];
  renderScreen: (screen: string) => ReactNode; scope?: string;
}) {
  const { colors, mode } = useTheme();
  const navigation = useRef(createNavigationContainerRef<Record<string, undefined>>()).current;
  const latest = useRef({ screen, onChange, scope }); latest.current = { screen, onChange, scope };
  function synchronize() {
    if (!navigation.isReady() || navigation.getCurrentRoute()?.name === latest.current.screen) return;
    const state = navigation.getRootState();
    if (state?.routes.some(route => route.name === latest.current.screen)) navigation.dispatch(StackActions.popTo(latest.current.screen));
    else navigation.navigate(latest.current.screen);
  }
  useEffect(() => { if (Platform.OS !== "web") synchronize(); }, [screen, scope]);
  if (Platform.OS === "web") return <>{renderScreen(screen)}</>;
  const base = mode === "dark" ? DarkTheme : DefaultTheme;
  return <NavigationContainer key={scope} ref={navigation} onReady={synchronize}
    theme={{ ...base, colors: { ...base.colors, primary: colors.orange, background: colors.background,
      card: colors.surface, text: colors.primary, border: colors.border } }}
    onStateChange={() => {
      if (scope !== latest.current.scope) return;
      const name = navigation.getCurrentRoute()?.name;
      if (name && name !== latest.current.screen) latest.current.onChange(name);
    }}>
    <Stack.Navigator initialRouteName={screen} screenOptions={{ headerShown: false, gestureEnabled: true,
      contentStyle: { backgroundColor: colors.background }, animation: "default" }}>
      {screens.map(name => <Stack.Screen key={name} name={name} options={{ headerShown: headerScreens.has(name), title: titles[name] ?? name, headerTintColor: colors.primary }}>{() => <SafeAreaView edges={headerScreens.has(name) ? ["left", "right"] : ["top", "left", "right"]} style={{flex:1}}><NativeHeaderContext.Provider value={headerScreens.has(name)}>{renderScreen(name)}</NativeHeaderContext.Provider></SafeAreaView>}</Stack.Screen>)}
    </Stack.Navigator>
  </NavigationContainer>;
}
