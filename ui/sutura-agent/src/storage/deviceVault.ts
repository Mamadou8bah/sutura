import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export function deviceKey(scope: string, kind: string) {
  return `sutura_${kind}_${bytesToHex(sha256(utf8ToBytes(scope)))}`;
}
export const nativeVaultAvailable = async () => Platform.OS !== "web" && await SecureStore.isAvailableAsync();
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export async function vaultRead(key: string) { return SecureStore.getItemAsync(key, options); }
export async function vaultWrite(key: string, value: string) { await SecureStore.setItemAsync(key, value, options); }
export async function vaultRemove(key: string) { await SecureStore.deleteItemAsync(key); }

type Snapshot<T> = { version: 1; savedAt: number; data: T };
const memory = new Map<string, Snapshot<unknown>>();
const persistedAt = new Map<string, number>();
const queues = new Map<string, Promise<unknown>>();
function serial<T>(scope: string, job: () => Promise<T>): Promise<T> {
  const task = (queues.get(scope) ?? Promise.resolve()).catch(() => undefined).then(job);
  queues.set(scope, task);
  return task;
}
const MAX_AGE = 24 * 60 * 60 * 1000;
function decodeUtf8(bytes: Uint8Array) {
  if (typeof TextDecoder === "function") return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  // Some native JS engines expose TextEncoder before TextDecoder. Preserve
  // international names without requiring another native/polyfill dependency.
  let encoded = "";
  for (let i = 0; i < bytes.length; i++) encoded += `%${bytes[i].toString(16).padStart(2, "0")}`;
  return decodeURIComponent(encoded);
}
export function sameSnapshot(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }

/** Only ciphertext enters AsyncStorage on native. Web keeps an in-memory snapshot. */
export function saveSnapshot<T>(scope: string, data: T, savedAt = Date.now()): Promise<void> {
  return serial(scope, async () => {
    const snapshot: Snapshot<T> = { version: 1, savedAt, data };
    const previous = memory.get(scope);
    memory.set(scope, snapshot);
    if (previous && sameSnapshot(previous.data, data) && Date.now() - (persistedAt.get(scope) ?? 0) < 300000) return;
    if (!await nativeVaultAvailable()) return;
    const plain = JSON.stringify(snapshot);
    if (plain.length > 512000) return;
    const keyName = deviceKey(scope, "cache_key");
    const encoded = await vaultRead(keyName);
    const key = encoded ? await Crypto.AESEncryptionKey.import(encoded, "hex") : await Crypto.AESEncryptionKey.generate();
    if (!encoded) await vaultWrite(keyName, await key.encoded("hex"));
    const sealed = await Crypto.aesEncryptAsync(utf8ToBytes(plain), key, { additionalData: utf8ToBytes(keyName) });
    await AsyncStorage.setItem(deviceKey(scope, "snapshot"), await sealed.combined("base64") as string);
    persistedAt.set(scope, savedAt);
  });
}
export function loadSnapshot<T>(scope: string): Promise<Snapshot<T> | null> {
  return serial(scope, async () => {
    let snapshot = memory.get(scope) as Snapshot<T> | undefined;
    if (!snapshot && await nativeVaultAvailable()) {
      const keyName = deviceKey(scope, "cache_key");
      const [encoded, encrypted] = await Promise.all([vaultRead(keyName), AsyncStorage.getItem(deviceKey(scope, "snapshot"))]);
      if (!encoded || !encrypted || encrypted.length > 1000000) return null;
      try {
        const key = await Crypto.AESEncryptionKey.import(encoded, "hex");
        const plain = await Crypto.aesDecryptAsync(Crypto.AESSealedData.fromCombined(encrypted), key, { additionalData: utf8ToBytes(keyName) });
        snapshot = JSON.parse(decodeUtf8(plain as Uint8Array));
      } catch { return null; }
    }
    if (!snapshot || snapshot.version !== 1 || !Number.isFinite(snapshot.savedAt) || snapshot.savedAt > Date.now() + 60000 || Date.now() - snapshot.savedAt > MAX_AGE) return null;
    memory.set(scope, snapshot);
    if (!persistedAt.has(scope)) persistedAt.set(scope, snapshot.savedAt);
    return snapshot;
  });
}
export async function clearDeviceData(scope: string) {
  await serial(scope, async () => {
    memory.delete(scope); persistedAt.delete(scope);
    await AsyncStorage.removeItem(deviceKey(scope, "snapshot"));
    if (await nativeVaultAvailable()) {
      await Promise.all(["cache_key", "pin", "biometric"].map(kind => vaultRemove(deviceKey(scope, kind))));
    }
  });
}
