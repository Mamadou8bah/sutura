import { useDeviceLock } from "../context/DeviceLockContext";
import { useIsFocused } from "@react-navigation/native";
import { QrScanner } from "./QrScanner";
export default function NativeCamera({onCode,onManual}:{onCode:(code:string)=>void;onManual:()=>void}) {
  const focused=useIsFocused();const {unlocked}=useDeviceLock();
  if(!focused||!unlocked)return null;
  return <QrScanner onCode={onCode} onManual={onManual} label="Place the customer's QR inside the frame"/>;
}
