const FRAUD_PATTERNS = [
  /fraud detection/i,
  /transaction blocked/i,
  /held for manual review/i,
  /velocity_burst/i,
];

export function isFraudBlockedMessage(message: string): boolean {
  return FRAUD_PATTERNS.some((pattern) => pattern.test(message));
}

export function formatFraudError(message: string): string {
  if (/Sentinel.*(unavailable|not connected|invalid decision)|security check.*unavailable/i.test(message)) {
    return "We couldn't complete the security check. Check Activity before trying again.";
  }
  if (!isFraudBlockedMessage(message)) {
    return message;
  }
  if (/review/i.test(message)) {
    return "This transaction is under review. No money has moved yet. Check Activity for the result before trying again.";
  }
  return "This transaction was blocked for your security. If you believe this is a mistake, contact Sutura support.";
}
