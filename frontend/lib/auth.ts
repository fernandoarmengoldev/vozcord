import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1] ?? '';
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload) return null;

    return payload.userId?.toString() || payload.sub?.toString() || payload.id?.toString() || null;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // El token solo está accesible cuando el dispositivo está desbloqueado
  });
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
