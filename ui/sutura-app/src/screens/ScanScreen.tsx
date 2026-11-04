import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import MerchantScanner from "../components/MerchantScanner";
import { OperationScreen, WalletPicker, FormError, SubmitButton } from "../components/OperationForm";
import { PrimaryButton } from "../components/ui";
import { api, type MerchantPayment } from "../api/client";
import { isDemoMode } from "../api/demo";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import { formatMoney } from "../utils/format";
import { parseMerchantQr } from "../utils/merchantQr";

export function ScanScreen() {
 const {colors}=useTheme();
 const {data,selectedWalletId,setSelectedWalletId,selectedWallet,balanceHidden,refreshData}=useWallet();
 const [payment,setPayment]=useState<MerchantPayment|null>(null);
 const [result,setResult]=useState<MerchantPayment|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const lastScan=useRef("");const lock=useRef(false);const mounted=useRef(true);const paymentMode=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function lookup(value:string) {
  if(lock.current||payment)return;
  lock.current=true;setBusy(true);setError("");Keyboard.dismiss();
  try {
   const reference=parseMerchantQr(value);const mode=isDemoMode();
   const found=await api.lookupMerchantPayment(reference);
   if(!mounted.current)return;
   if(mode!==isDemoMode())throw new Error("Connection changed. Scan the code again before paying.");
   if(found.reference!==reference||!Number.isFinite(Number(found.amount))||Number(found.amount)<0.01||!(/^[A-Z]{3}$/.test(found.currency)))throw new Error("Invalid merchant payment details.");
   if(found.status!=="ACTIVE")throw new Error(`This payment is ${found.status.toLowerCase()}. Ask the merchant for a new QR code.`);
   if(found.expiresAt&&Date.parse(found.expiresAt)<=Date.now())throw new Error("This payment has expired. Ask the merchant for a new QR code.");
   paymentMode.current=mode;setPayment(found);
   const wallet=data.wallets.find(w=>w.status==="ACTIVE"&&w.currency===found.currency);
   if(wallet)setSelectedWalletId(wallet.id);
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Could not read merchant payment.");}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 async function pay() {
  if(lock.current||!payment)return;
  if(paymentMode.current!==isDemoMode()){setError("Connection changed. Scan the code again before paying.");return;}
  if(selectedWallet.status!=="ACTIVE"||selectedWallet.currency!==payment.currency){setError(`Choose an active ${payment.currency} wallet.`);return;}
  if(Number(payment.amount)>selectedWallet.balance){setError("Insufficient balance. Top up your wallet before paying.");return;}
  lock.current=true;setBusy(true);setError("");
  try {
   const paid=await api.payMerchant(payment.reference,selectedWalletId);
   if(paymentMode.current!==isDemoMode())throw new Error("Connection changed. Check your payment status after reconnecting before trying again.");
   if(!mounted.current)return;
   setResult(paid);
   try{await refreshData();}catch{/* Payment result remains authoritative if the balance refresh fails. */}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Payment could not be confirmed. Check activity before trying again.");}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 function reset(){lastScan.current="";setPayment(null);setResult(null);setError("");}
 if(result)return <OperationScreen title={result.status==="PAID"?"Payment complete":result.status==="REVIEW"?"Payment under review":"Payment status"}>
  <Ionicons name={result.status==="PAID"?"checkmark-circle-outline":"time-outline"} size={64} color={result.status==="PAID"?colors.emerald700:colors.orange}/>
  <Text style={{fontSize:32,fontWeight:"700",color:colors.primary}}>{formatMoney(Number(result.amount),result.currency,4)}</Text>
  <Text style={{color:colors.primary,fontSize:17}}>{result.merchantName}</Text>
  <Text style={{color:colors.slate500,lineHeight:21}}>{result.status==="PAID"?(paymentMode.current?"Sample payment completed locally.":"Your merchant payment is complete."):result.status==="REVIEW"?"Your payment is pending review. It has not completed. Check Activity for updates.":`Payment status: ${result.status}. Check Activity before paying again.`}</Text>
  <Text selectable style={{color:colors.slate500,fontSize:12}}>{result.transactionReference||result.reference}</Text>
  <PrimaryButton label="Scan another code" onPress={reset}/>
 </OperationScreen>;
 if(payment)return <OperationScreen title="Review payment" subtitle="Check the merchant and amount before confirming.">
  <View style={{alignItems:"center",paddingVertical:24,gap:12,backgroundColor:colors.surfaceMuted,borderRadius:16}}><Ionicons name="storefront-outline" color={colors.orange} size={36}/><Text style={{color:colors.primary,fontSize:19,fontWeight:"600"}}>{payment.merchantName}</Text><Text style={{color:colors.primary,fontSize:30,fontWeight:"700"}}>{formatMoney(Number(payment.amount),payment.currency,4)}</Text>{!!payment.description&&<Text style={{color:colors.slate500,textAlign:"center",paddingHorizontal:16}}>{payment.description}</Text>}</View>
  <WalletPicker wallets={data.wallets.filter(w=>w.currency===payment.currency)} selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden}/>
  {!data.wallets.some(w=>w.currency===payment.currency&&w.status==="ACTIVE")&&<Text style={{color:colors.rose800}}>You need an active {payment.currency} wallet to pay this merchant.</Text>}
  <FormError message={error}/><SubmitButton label="Confirm payment" loading={busy} disabled={busy||!selectedWallet.id||selectedWallet.currency!==payment.currency||selectedWallet.status!=="ACTIVE"} onPress={()=>void pay()}/>
  <PrimaryButton label="Cancel payment" color={colors.surfaceMuted} textColor={colors.primary} disabled={busy} onPress={reset}/>
 </OperationScreen>;
 return <OperationScreen title="Scan & pay" subtitle="Scan the merchant’s Sutura QR code.">
  {!busy&&<MerchantScanner onCode={value=>{if(value!==lastScan.current){lastScan.current=value;void lookup(value);}}}/>}
  {busy&&<ActivityIndicator accessibilityLabel="Looking up merchant" color={colors.orange}/>}
  <FormError message={error}/>{!!error&&<PrimaryButton label="Scan again" color={colors.surfaceMuted} textColor={colors.primary} onPress={()=>{lastScan.current="";setError("");}}/>}
  {isDemoMode()&&<PrimaryButton label="Try sample merchant QR" color={colors.surfaceMuted} textColor={colors.primary} disabled={busy} onPress={()=>void lookup("DEMO-COLLECTION")}/>}
  <Text style={{color:colors.slate500,fontSize:12,lineHeight:19}}>You’ll review the merchant, amount and wallet before any payment is made.</Text>
 </OperationScreen>;
}
