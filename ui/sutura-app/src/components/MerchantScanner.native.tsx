import { useDeviceLock } from "../context/DeviceLockContext";
import { useIsFocused } from "@react-navigation/native";
import { QrScanner } from "./QrScanner";
export default function MerchantScanner({onCode}:{onCode:(value:string)=>void}) {
  const focused=useIsFocused();const {unlocked}=useDeviceLock();
  if(!focused||!unlocked)return null;
  return <QrScanner onCode={onCode} label="Place the merchant QR inside the frame"/>;
}
