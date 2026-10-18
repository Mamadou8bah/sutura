import { authFetch, readAuthJson } from "./sessionAuth";
export type MerchantApplication = {businessName:string;tradingName:string|null;category:string;region:string;cityOrArea:string;streetAddress:string;businessRegistrationNumber:string|null;firstName:string;lastName:string;ownerIdType:string;ownerIdNumber:string;status:string;userStatus:string;reviewReason:string|null;submittedAt:string};
export type ApplicationCorrection=Omit<MerchantApplication,"status"|"userStatus"|"reviewReason"|"submittedAt"> & {explanation:string};
export const applicationApi={
 status:async()=>readAuthJson<MerchantApplication>(await authFetch("/api/v1/merchant/application")),
 resubmit:async(body:ApplicationCorrection)=>readAuthJson<MerchantApplication>(await authFetch("/api/v1/merchant/application/resubmit",{method:"POST",body:JSON.stringify(body)})),
};
