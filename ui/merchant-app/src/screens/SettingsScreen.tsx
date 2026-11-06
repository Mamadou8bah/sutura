import { NativeSwitch as Switch } from "../components/NativeControls";
import {useState} from "react";
import { ScrollView, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import {BackHeader} from "../components/AppHeader";
import {ThemePicker} from "../components/ThemePicker";
import {SelectionSheet} from "../components/SelectionSheet";
import {PrimaryButton} from "../components/ui";
import {useTheme} from "../context/ThemeContext";
import {fonts} from "../theme";
import {SettingsRow} from "../components/SettingsRow";
import {useApp} from "../context/AppContext";
import {useMerchant} from "../context/MerchantContext";
export function SettingsScreen(){const {colors}=useTheme();const {session,setScreen,signOut}=useApp();const {hidden,setHidden,refresh,loading,error:loadError}=useMerchant();
 const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const section=(title:string)=><Text style={{fontFamily:fonts.bold,color:colors.slate500,fontSize:12,marginTop:18}}>{title}</Text>;
 return <ScrollView contentContainerStyle={{padding:20,paddingBottom:36,gap:8}}><BackHeader title="Settings" onBack={()=>setScreen("more")}/>{section("Account")}<SettingsRow label="Business account" icon="storefront-outline" value={session?.businessName||"Merchant"}/><SettingsRow label="Email" icon="mail-outline" value={session?.email||"Not provided"}/><SettingsRow label="Account status" icon="checkmark-circle-outline" value={session?.userStatus?.replace(/_/g," ")}/><SettingsRow label="Identity verification" icon="shield-checkmark-outline" onPress={()=>setScreen("verification")}/><SettingsRow label="Business wallets" icon="wallet-outline" onPress={()=>setScreen("wallets")}/>{section("Privacy")}<SettingsRow label="Hide balances" hint="Hide amounts across wallets, collections and activity" icon="eye-off-outline" trailing={<Switch accessibilityLabel="Hide balances" value={hidden} onValueChange={setHidden} trackColor={{false:colors.border,true:colors.orange}} thumbColor={colors.white}/>}/>
 {section("Appearance")}<ThemePicker/>{section("Data & general")}<SettingsRow label="Refresh data" hint="Data also refreshes every 30 seconds while visible" icon="refresh-outline" value={loading?"Refreshing…":""} onPress={()=>{if(!loading)void refresh();}}/>{!!loadError&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{loadError}</Text>}<SettingsRow label="Language" icon="language-outline" value="English"/>
 {section("Help & about")}<SettingsRow label="Help & support" hint="Send a ticket and read replies" icon="help-circle-outline" onPress={()=>setScreen("support")}/><SettingsRow label="App version" icon="information-circle-outline" value="0.1.0"/>
 {section("Security")}<SettingsRow label="Sign out" hint="End this session on this device" icon="log-out-outline" onPress={()=>{setError("");setConfirm(true);}}/>
 <SelectionSheet visible={confirm} title="Sign out?" onClose={()=>{if(!busy)setConfirm(false);}}><View style={{gap:20}}><Text style={{fontFamily:fonts.regular,color:colors.slate500,lineHeight:22}}>You will need to log in again to access your account.</Text>{!!error&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{error}</Text>}<PrimaryButton label={busy?"Signing out…":"Confirm sign out"} disabled={busy} onPress={()=>{if(busy)return;setBusy(true);void signOut().catch(()=>setError("Could not sign out. Try again.")).finally(()=>setBusy(false));}}/></View></SelectionSheet></ScrollView>;}
