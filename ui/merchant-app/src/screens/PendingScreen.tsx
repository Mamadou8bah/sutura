import {useState} from "react";
import {Text,View} from "react-native";
import {useTheme} from "../context/ThemeContext";
import {useApp} from "../context/AppContext";
import {Card,Field,AppInput,PrimaryButton,Screen,SuturaLogo,LinkButton} from "../components/ui";
import {OptionPicker} from "../components/OptionPicker";
import {BUSINESS_CATEGORIES,GAMBIA_REGIONS,ID_TYPES} from "../constants/registration";
import {applicationApi,type ApplicationCorrection} from "../api/application";
import {isValidName} from "../utils/inputValidation";
import {fonts} from "../theme";
export function PendingScreen(){
 const {colors}=useTheme();const {session,application,refreshApplication,signOut,setScreen}=useApp();
 const [draft,setDraft]=useState<ApplicationCorrection|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const status=application?.status??"PENDING_REVIEW";const correctionAllowed=status==="REJECTED"||status==="MORE_INFO_REQUIRED";
 const field=(name:keyof ApplicationCorrection,label:string,maxLength:number)=> <Field key={name} label={label}><AppInput accessibilityLabel={label} value={draft?.[name]??""} maxLength={maxLength} editable={!busy} onChangeText={value=>setDraft(current=>current?{...current,[name]:value}:current)} /></Field>;
 async function submit(){if(!draft||busy)return;if(!isValidName(draft.firstName.trim())||!isValidName(draft.lastName.trim())){setError("Enter the owner's first and last name using letters.");return;}
  if(!draft.businessName.trim()||!draft.cityOrArea.trim()||!draft.streetAddress.trim()||!draft.ownerIdNumber.trim()||!draft.explanation.trim()){setError("Complete all required details and explain the correction.");return;}
  setBusy(true);setError("");try{await applicationApi.resubmit(draft);await refreshApplication();setDraft(null);}catch(err){setError(err instanceof Error?err.message:"Could not resubmit application");}finally{setBusy(false);}}
 return <Screen><View style={{alignItems:"center",gap:16}}><SuturaLogo size={48}/><Text style={{fontFamily:fonts.bold,fontSize:26,color:colors.primary}}>{correctionAllowed?"Update your application":"Application under review"}</Text><Text style={{color:colors.slate500,lineHeight:22}}>{session?.businessName||"Your business"} can accept payments after approval.</Text></View>
 <Card><Text style={{fontFamily:fonts.bold,color:colors.primary}}>{status.replace(/_/g," ")}</Text>{!!application?.reviewReason&&<Text style={{color:colors.slate500,marginTop:12}}>{application.reviewReason}</Text>}</Card>
 <PrimaryButton label="Verify owner identity" onPress={()=>setScreen("verification")}/>
 {!!error&&<Text accessibilityRole="alert" style={{color:colors.rose800}}>{error}</Text>}
 {correctionAllowed&&!draft&&<PrimaryButton label="Correct and resubmit" onPress={()=>{if(application)setDraft({...application,explanation:""});}}/>}
 {draft&&<>
 {field("businessName","Business name",120)}{field("tradingName","Trading name (optional)",120)}
 <OptionPicker label="Business category" options={BUSINESS_CATEGORIES} value={draft.category} onChange={value=>setDraft({...draft,category:value})} disabled={busy}/>
 <OptionPicker label="Region" options={GAMBIA_REGIONS} value={draft.region} onChange={value=>setDraft({...draft,region:value})} disabled={busy}/>
 {field("cityOrArea","City or area",80)}{field("streetAddress","Street address",255)}{field("businessRegistrationNumber","Registration number (optional)",60)}
 {field("firstName","Owner first name",100)}{field("lastName","Owner last name",100)}
 <OptionPicker label="Identity document type" options={ID_TYPES} value={draft.ownerIdType} onChange={value=>setDraft({...draft,ownerIdType:value})} disabled={busy}/>
 {field("ownerIdNumber","Owner identity document number",40)}{field("explanation","What did you correct?",1000)}
 <Text style={{color:colors.slate500}}>Changing owner identity details starts a new verification. The account stays pending until reviewed.</Text>
 <PrimaryButton label={busy?"Submitting...":"Submit corrections"} disabled={busy} onPress={()=>void submit()}/><LinkButton label="Cancel changes" onPress={()=>{if(!busy)setDraft(null);}}/>
 </>}
 <PrimaryButton label={busy?"Please wait...":"Check application status"} disabled={busy} onPress={()=>{setBusy(true);setError("");void refreshApplication().catch(err=>setError(err instanceof Error?err.message:"Could not refresh")).finally(()=>setBusy(false));}}/>
 <LinkButton label="Sign out" onPress={()=>void signOut()}/>
 </Screen>;
}
