import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store no está disponible en web (lanza excepción), así que allí se usa localStorage

export async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      // Almacenamiento no disponible (modo privado, etc.)
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
