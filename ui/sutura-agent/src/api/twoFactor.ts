export type VerificationCode = { challengeId: string; code: string };
export class TwoFactorRequiredError extends Error {
  constructor(public challengeId: string) { super("Enter the six-digit verification code sent to you."); this.name = "TwoFactorRequiredError"; }
}
export function assertVerifiedSession(auth: { accessToken?: string | null; refreshToken?: string | null; twoFactorRequired?: boolean; twoFactorChallengeId?: string | null }) {
  if (auth.twoFactorRequired && auth.twoFactorChallengeId) throw new TwoFactorRequiredError(auth.twoFactorChallengeId);
  if (!auth.accessToken || !auth.refreshToken) throw new Error("Sign-in did not return a verified session.");
}
