import { BackHeader } from "../components/AppHeader";
import { ReviewCard, ReviewRow } from "../components/Review";
import { SelectionSheet } from "../components/SelectionSheet";
import { SwipeToConfirm } from "../components/SwipeToConfirm";
import { statusLabel } from "../components/StatusPill";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, View } from "react-native";
import { NativeText as Text } from "../components/NativeControls";
import { Ionicons } from "@expo/vector-icons";
import MerchantScanner from "../components/MerchantScanner";
import { OperationScreen, WalletPicker, FormError } from "../components/OperationForm";
import { PrimaryButton } from "../components/ui";
import { api, type MerchantPayment } from "../api/client";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import { formatMoney } from "../utils/format";
import { parseMerchantQr } from "../utils/merchantQr";

export function ScanScreen() {
 const {colors}=useTheme();
 const {data,selectedWalletId,setSelectedWalletId,selectedWallet,balanceHidden,refreshData,setTab,openTransaction}=useWallet();
 const [payment,setPayment]=useState<MerchantPayment|null>(null);
 const [result,setResult]=useState<MerchantPayment|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const lastScan=useRef("");const lock=useRef(false);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function lookup(value:string) {
  if(lock.current||payment)return;
  lock.current=true;setBusy(true);setError("");Keyboard.dismiss();
  try {
   const reference=parseMerchantQr(value);
   const found=await api.lookupMerchantPayment(reference);
   if(!mounted.current)return;
   if(found.reference!==reference||!Number.isFinite(Number(found.amount))||Number(found.amount)<0.01||!(/^[A-Z]{3}$/.test(found.currency)))throw new Error("Invalid merchant payment details.");
   if(found.status!=="ACTIVE")throw new Error(`This payment is ${statusLabel(found.status).toLowerCase()}. Ask the merchant for a new QR code.`);
   if(found.expiresAt&&Date.parse(found.expiresAt)<=Date.now())throw new Error("This payment has expired. Ask the merchant for a new QR code.");
   setPayment(found);
   const wallet=data.wallets.find(w=>w.status==="ACTIVE"&&w.currency===found.currency);
   if(wallet)setSelectedWalletId(wallet.id);
  }catch(e){if(mounted.current){lastScan.current="";setError(e instanceof Error?e.message:"Could not read merchant payment.");}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 async function pay() {
  if(lock.current||!payment)return;
  if(selectedWallet.status!=="ACTIVE"||selectedWallet.currency!==payment.currency){setError(`Choose an active ${payment.currency} wallet.`);return;}
  if(Number(payment.amount)>selectedWallet.balance){setError("Insufficient balance. Top up your wallet before paying.");return;}
  lock.current=true;setBusy(true);setError("");
  try {
   const paid=await api.payMerchant(payment.reference,selectedWalletId);
   if(!mounted.current)return;
   setResult(paid);
   try{await refreshData();}catch{/* Payment result remains authoritative if the balance refresh fails. */}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:"Payment could not be confirmed. Check activity before trying again.");}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 function reset(){lastScan.current="";setPayment(null);setResult(null);setError("");}
 const canPay = !!selectedWallet.id && selectedWallet.currency === payment?.currency && selectedWallet.status === "ACTIVE";
 const receipt = result?.transactionReference ? data.transactions.find(transaction => transaction.reference === result.transactionReference) : undefined;
 return <OperationScreen>
  <BackHeader title="QR Scan" onBack={() => { if (!busy) setTab("home"); }} />
  {payment && !result && <SelectionSheet visible title="Payment Confirmation" onClose={() => { if (!busy) reset(); }}>
    <View style={{ gap: 12 }}>
      <ReviewCard>
        <ReviewRow label="Merchant" value={payment.merchantName || "Merchant"} />
        <ReviewRow label="Reference" value={payment.reference} />
        <ReviewRow label="Total amount" value={formatMoney(Number(payment.amount), payment.currency, 4)} emphasis money last />
      </ReviewCard>
      <WalletPicker compact wallets={data.wallets.filter(wallet => wallet.currency === payment.currency)}
        selectedId={selectedWalletId} onSelect={setSelectedWalletId} hidden={balanceHidden} />
      {!canPay && <Text style={{ color: colors.rose800 }}>You need an active {payment.currency} wallet to pay this merchant.</Text>}
      <FormError message={error} />
      <SwipeToConfirm label="Swipe to Pay" busy={busy} disabled={!canPay} onConfirm={() => void pay()} />
    </View>
  </SelectionSheet>}
  {result && <SelectionSheet visible title={result.status === "PAID" ? "Payment Successful" : result.status === "PROCESSING" ? "Payment processing" : result.status === "REVIEW" ? "Payment under review" : "Payment status"}
    onClose={reset}>
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center", paddingVertical: 8 }}>
        <Ionicons name={result.status === "PAID" ? "checkmark-circle-outline" : "time-outline"} size={54}
          color={result.status === "PAID" ? colors.emerald700 : colors.accentText} />
      </View>
      <ReviewCard>
        <ReviewRow label="Transaction ID" value={result.transactionReference || result.reference} />
        <ReviewRow label="Merchant" value={result.merchantName || "Merchant"} />
        <ReviewRow label="Amount" value={formatMoney(Number(result.amount), result.currency, 4)} emphasis money />
        <ReviewRow label="Status" value={statusLabel(result.status)} last />
      </ReviewCard>
      {result.status !== "PAID" && <Text style={{ color: colors.slate500 }}>Check Transactions for updates before paying again.</Text>}
      {receipt && result.status === "PAID" && <PrimaryButton label="Get Receipt" color={colors.surfaceMuted} textColor={colors.primary}
        onPress={() => { reset(); openTransaction(receipt.id); }} />}
      <PrimaryButton label="Scan Again" onPress={reset} />
    </View>
  </SelectionSheet>}
  {!payment&&!result&&!busy&&!error&&<MerchantScanner onCode={value=>{if(value!==lastScan.current){lastScan.current=value;void lookup(value);}}}/>}
  {busy&&!payment&&<ActivityIndicator accessibilityLabel="Looking up merchant" color={colors.slate500}/>}
  <FormError message={payment ? "" : error}/>{!payment&&!!error&&<PrimaryButton label="Scan again" color={colors.surfaceMuted} textColor={colors.primary} onPress={()=>{lastScan.current="";setError("");}}/>}
  <Text style={{color:colors.slate500,fontSize:12,lineHeight:19}}>You’ll review the merchant, amount and wallet before any payment is made.</Text>
 </OperationScreen>;
}
