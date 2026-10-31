import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Prefer SecureStore on native; fall back to AsyncStorage on web.
 * Tokens are never written to plain storage on iOS/Android when SecureStore is available.
 */
async function getSecureStore() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-secure-store");
  } catch {
    return null;
  }
}

export async function saveSession(key: string, value: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function loadSession(key: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = async () => {
    const secureStore = await getSecureStore();
    return secureStore ? secureStore.getItemAsync(key) : AsyncStorage.getItem(key);
  };
  try {
    return await Promise.race([read(), new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), 3000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function clearSession(key: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}
