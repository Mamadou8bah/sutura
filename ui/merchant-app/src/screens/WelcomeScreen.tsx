import {fonts as appFonts} from "../theme";
import {useTheme,useThemedStyles} from "../context/ThemeContext";
import type {ThemeColors} from "../theme";
import { StyleSheet, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { LinkButton, SuturaLogo, PrimaryButton, Screen } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors } from "../theme";

export function WelcomeScreen() {
 const {colors}=useTheme();
 const styles=useThemedStyles(createStyles);

  const { setScreen } = useApp();

  return (
    <Screen>
      <View style={styles.hero}>
        <SuturaLogo size={64} />
        <Text style={styles.eyebrow}>Sutura Merchant</Text>
        <Text style={styles.title}>Accept payments for your business</Text>
        <Text style={styles.body}>
          Register your Gambian business, verify your phone, and start collecting payments once approved.
        </Text>
      </View>

      <PrimaryButton label="Register my business" onPress={() => setScreen("reg-phone")} />
      <LinkButton label="Already registered? Sign in" onPress={() => setScreen("login")} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: { alignItems: "flex-start", gap: 12, paddingVertical: 24 },
  eyebrow: {fontFamily: appFonts.bold, fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.slate500, textTransform: "uppercase" },
  title: {fontFamily: appFonts.bold, fontSize: 34, fontWeight: "800", color: colors.slate900, textAlign: "left" },
  body: {fontFamily: appFonts.regular, fontSize: 15, lineHeight: 22, color: colors.slate500, textAlign: "left" },
});
