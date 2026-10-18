import type { VerificationCode } from "./twoFactor";
import { post } from "./client";

export type StepResponse = {
  registrationToken: string;
  stage: number;
  message: string;
  expiresAt: string;
};

export type CompleteResponse = {
  auth: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresInSeconds: number;
    userId: number;
    username: string;
    role: string;
    userStatus: string;
    twoFactorRequired: boolean;
    twoFactorChallengeId: string | null;
  };
  businessName: string;
  verificationStatus: string;
  message: string;
};

export const merchantRegistrationApi = {
  sendPhone: (phoneNumber: string) => post<StepResponse>("/api/auth/merchant/register/phone", { phoneNumber }),
  verifyPhone: (registrationToken: string, code: string) =>
    post<StepResponse>("/api/auth/merchant/register/verify-phone", { registrationToken, code }),
  saveBusiness: (payload: {
    registrationToken: string;
    businessName: string;
    tradingName?: string;
    category: string;
    region: string;
    cityOrArea: string;
    streetAddress: string;
    businessRegistrationNumber?: string;
  }) => post<StepResponse>("/api/auth/merchant/register/business", payload),
  saveOwner: (payload: {
    registrationToken: string;
    firstName: string;
    lastName: string;
    ownerIdType: string;
    ownerIdNumber: string;
  }) => post<StepResponse>("/api/auth/merchant/register/owner", payload),
  complete: (payload: {
    registrationToken: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  }) => post<CompleteResponse>("/api/auth/merchant/register/complete", payload),
};

export type AuthPayload = CompleteResponse["auth"];

export const authApi = {
  login: (username: string, password: string, verification?: VerificationCode) =>
    post<AuthPayload>("/api/auth/login", { username, password, twoFactorChallengeId: verification?.challengeId, twoFactorCode: verification?.code }),
};
