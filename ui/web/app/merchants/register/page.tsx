import type { Metadata } from "next";
import MerchantRegisterPage from "./merchant-registration-page";

export const metadata: Metadata = {
  title: "Register your business",
  description: "What you need to register a business with Sutura and what happens after you apply.",
};

export default function Page() {
  return <MerchantRegisterPage />;
}
