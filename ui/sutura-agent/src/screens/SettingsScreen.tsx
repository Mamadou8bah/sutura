import {useState} from "react";
import { ScrollView, Switch, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import {BackHeader} from "../components/AppHeader";
import {ThemePicker} from "../components/ThemePicker";
import {SelectionSheet} from "../components/SelectionSheet";
import {PrimaryButton} from "../components/ui";
import {useTheme} from "../context/ThemeContext";
import {fonts} from "../theme";
import {SettingsRow} from "../components/SettingsRow";
import {useAgent} from "../context/AgentContext";
import {useAuth} from "../context/AuthContext";
export function SettingsScreen(){const {colors}=useTheme();const {session,setTab,refreshHistory,historyLoading,historyError}=useAgent();const {signOut}=useAuth();
 const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const section=(title:string)=><Text style={{fontFamily:fonts.bold,color:colors.slate500,fontSize:12,marginTop:18}}>{title}</Text>;
 return <ScrollView contentContainerStyle={{padding:20,paddingBottom:36,gap:8}}><BackHeader title="Settings" onBack={()=>setTab("more")}/>{section("Account")}<SettingsRow label="Agent profile" hint="View your account information" icon="person-outline" onPress={()=>setTab("profile")}/><SettingsRow label="Signed in as" icon="id-card-outline" value={session.agentCode}/>
 {section("Appearance")}<ThemePicker/>{section("Data & general")}<SettingsRow label="Refresh data" hint="Data also refreshes every 30 seconds while visible" icon="refresh-outline" value={historyLoading?"Refreshing…":""} onPress={()=>{if(!historyLoading)void refreshHistory();}}/>{!!historyError&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{historyError}</Text>}<SettingsRow label="Language" icon="language-outline" value="English"/>
 {section("Help & about")}<SettingsRow label="Help & support" hint="Send a ticket and read replies" icon="help-circle-outline" onPress={()=>setTab("support")}/><SettingsRow label="App version" icon="information-circle-outline" value="0.1.0"/>
 {section("Security")}<SettingsRow label="Sign out" hint="End this session on this device" icon="log-out-outline" onPress={()=>{setError("");setConfirm(true);}}/>
 <SelectionSheet visible={confirm} title="Sign out?" onClose={()=>{if(!busy)setConfirm(false);}}><View style={{gap:20}}><Text style={{fontFamily:fonts.regular,color:colors.slate500,lineHeight:22}}>You will need to log in again to access your account.</Text>{!!error&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{error}</Text>}<PrimaryButton label={busy?"Signing out…":"Confirm sign out"} disabled={busy} onPress={()=>{if(busy)return;setBusy(true);void signOut().catch(()=>setError("Could not sign out. Try again.")).finally(()=>setBusy(false));}}/></View></SelectionSheet></ScrollView>;}
