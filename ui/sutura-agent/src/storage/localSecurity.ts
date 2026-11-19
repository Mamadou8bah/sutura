import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { deviceKey, vaultRead, vaultWrite, vaultRemove } from "./deviceVault";

export type LockRecord = { version: 1; salt: string; verifier: string; failures: number; blockedUntil: number; biometricHash: string | null };
const ITERATIONS = 600000;
const queues = new Map<string, Promise<unknown>>();
function serial<T>(scope: string, work: () => Promise<T>): Promise<T> {
  const task = (queues.get(scope) ?? Promise.resolve()).catch(() => undefined).then(work);
  queues.set(scope, task); return task;
}
const derive = async (pin: string, salt: string) => bytesToHex(await pbkdf2Async(sha256, utf8ToBytes(pin), hexToBytes(salt), { c: ITERATIONS, dkLen: 32 }));
function equal(a: string, b: string) { let difference = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return difference === 0; }
export async function readLock(scope: string): Promise<LockRecord | null> {
  const raw = await vaultRead(deviceKey(scope, "pin"));
  if (!raw) return null;
  const value = JSON.parse(raw) as LockRecord;
  if (value.version !== 1 || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{64}$/.test(value.verifier)
    || !Number.isSafeInteger(value.failures) || value.failures < 0 || !Number.isFinite(value.blockedUntil)
    || (value.biometricHash !== null && !/^[a-f0-9]{64}$/.test(value.biometricHash))) throw new Error("Unlock settings could not be read. Sign in again to reset this device.");
  return value;
}
export function pinIssue(pin: string) {
  if (!/^\d{6}$/.test(pin)) return "Use a six-digit PIN.";
  if (/^(\d)\1{5}$/.test(pin) || "01234567890123456789".includes(pin) || "98765432109876543210".includes(pin)) return "Choose a PIN without repeated or consecutive digits.";
  return null;
}
export function createPin(scope: string, pin: string): Promise<LockRecord> {
  return serial(scope, async () => {
    if (await readLock(scope)) throw new Error("Verify your current PIN before changing it.");
    const issue = pinIssue(pin); if (issue) throw new Error(issue);
    const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
    const record: LockRecord = { version: 1, salt, verifier: await derive(pin, salt), failures: 0, blockedUntil: 0, biometricHash: null };
    await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(record)); return record;
  });
}
export function verifyPin(scope: string, pin: string): Promise<LockRecord> {
  return serial(scope, async () => {
    const record = await readLock(scope); if (!record) throw new Error("No app PIN is configured.");
    if (record.failures >= 10) throw new Error("Too many attempts. Sign in with your password to reset the app PIN.");
    if (record.blockedUntil > Date.now()) throw new Error(`Try again in ${Math.ceil((record.blockedUntil - Date.now()) / 1000)} seconds.`);
    if (!/^\d{6}$/.test(pin)) throw new Error("Enter your six-digit PIN.");
    // Persist the attempt before expensive verification, including interrupted attempts.
    const attempted = { ...record, failures: record.failures + 1, blockedUntil: record.failures + 1 >= 5 ? Date.now() + 60000 : 0 };
    await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(attempted));
    if (!equal(await derive(pin, record.salt), record.verifier)) throw new Error(attempted.failures >= 10 ? "Too many attempts. Sign in with your password." : attempted.blockedUntil ? "Incorrect PIN. Try again in 60 seconds." : "Incorrect PIN. Try again.");
    const verified = { ...record, failures: 0, blockedUntil: 0 };
    await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(verified)); return verified;
  });
}
export async function changePin(scope: string, oldPin: string, nextPin: string) {
  const issue = pinIssue(nextPin); if (issue) throw new Error(issue);
  await verifyPin(scope, oldPin);
  return serial(scope, async () => {
    const current = await readLock(scope); if (!current) throw new Error("No app PIN is configured.");
    const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
    const updated = { ...current, salt, verifier: await derive(nextPin, salt), failures: 0, blockedUntil: 0 };
    await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(updated)); return updated;
  });
}
export async function removePin(scope: string, pin: string) {
  await verifyPin(scope, pin);
  await vaultRemove(deviceKey(scope, "biometric"));
  await vaultRemove(deviceKey(scope, "pin"));
}
export async function biometricAvailable() {
  return await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()
    && await LocalAuthentication.getEnrolledLevelAsync() >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
}
export async function setBiometric(scope: string, pin: string, enabled: boolean) {
  const record = await verifyPin(scope, pin);
  if (!enabled) {
    await vaultRemove(deviceKey(scope, "biometric"));
    const updated = { ...record, biometricHash: null }; await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(updated)); return updated;
  }
  if (!await biometricAvailable()) throw new Error("Set up a supported fingerprint or Face ID in your device settings first.");
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable biometric unlock for Sutura", biometricsSecurityLevel: "strong", disableDeviceFallback: true, cancelLabel: "Cancel" });
  if (!result.success) throw new Error("Biometric setup was cancelled or unsuccessful.");
  const secret = bytesToHex(await Crypto.getRandomBytesAsync(32));
  await SecureStore.setItemAsync(deviceKey(scope, "biometric"), secret, { requireAuthentication: true, keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  const updated = { ...record, biometricHash: bytesToHex(sha256(utf8ToBytes(secret))) };
  await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(updated)); return updated;
}
export async function verifyBiometric(scope: string) {
  const record = await readLock(scope);
  if (!record?.biometricHash || record.failures >= 10) throw new Error("Use your app PIN or sign in again.");
  if (!await biometricAvailable()) throw new Error("Biometrics are unavailable. Use your app PIN.");
  const secret = await SecureStore.getItemAsync(deviceKey(scope, "biometric"), { requireAuthentication: true, authenticationPrompt: "Unlock Sutura" });
  if (!secret || !equal(bytesToHex(sha256(utf8ToBytes(secret))), record.biometricHash)) throw new Error("Biometric unlock was cancelled or your enrolled biometrics changed. Use your app PIN.");
  const updated = { ...record, failures: 0, blockedUntil: 0 };
  await vaultWrite(deviceKey(scope, "pin"), JSON.stringify(updated)); return updated;
}
