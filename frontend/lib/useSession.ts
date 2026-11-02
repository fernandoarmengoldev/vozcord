import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { apiFetch } from './api';
import { getToken, setToken as saveToken, clearToken, getUserId } from './auth';
import { useZustandStore } from './store';
import { voiceService } from './voiceService';
import { resetVoiceWebSocketClient } from './mediasoup/voiceWebSocket';

export type SessionState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  error: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  name: string;
  password: string;
};

export function useSession() {
  const router = useRouter();
  const setUserId = useZustandStore((state) => state.setUserId);

  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    userId: null,
    error: null,
  });

  const checkSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await getToken();
      if (!token) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          userId: null,
          error: null,
        });
        return false;
      }

      const res = await apiFetch('/auth/me', { auth: true, method: 'GET' });

      if (res.ok) {
        const userId = await getUserId();
        if (userId) {
          setUserId(userId);
        }
        setState({
          isLoading: false,
          isAuthenticated: true,
          userId,
          error: null,
        });
        return true;
      } else {
        await clearToken();
        setState({
          isLoading: false,
          isAuthenticated: false,
          userId: null,
          error: null,
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        userId: null,
        error: 'Error al verificar la sesión',
      });
      return false;
    }
  }, [setUserId]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { email, password } = credentials;

    if (!email.trim() || !password.trim()) {
      setState((prev) => ({ ...prev, error: 'Email y contraseña son requeridos' }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        let message = res.status === 401
          ? 'Credenciales incorrectas'
          : 'No se pudo iniciar sesión';

        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error && res.status !== 401) {
            message = data.error;
          }
        } catch { }

        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return false;
      }

      const data = (await res.json()) as { token?: string };
      if (!data?.token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Respuesta inválida del servidor'
        }));
        return false;
      }

      await saveToken(data.token);

      const userId = await getUserId();
      if (userId) {
        setUserId(userId);
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        userId,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('Error during login:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Error de conexión'
      }));
      return false;
    }
  }, [setUserId]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const { email, name, password } = credentials;

    if (!email.trim() || !name.trim() || !password.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Todos los campos son requeridos'
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password
        }),
      });

      if (!res.ok) {
        let message = res.status === 409
          ? 'Ese email ya está registrado'
          : 'No se pudo crear la cuenta';

        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error && res.status !== 409) {
            message = data.error;
          }
        } catch { }

        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return false;
      }

      const data = (await res.json()) as { token?: string };
      if (!data?.token) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Respuesta inválida del servidor'
        }));
        return false;
      }

      await saveToken(data.token);

      const userId = await getUserId();
      if (userId) {
        setUserId(userId);
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        userId,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('Error during registration:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Error de conexión'
      }));
      return false;
    }
  }, [setUserId]);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Salir de la llamada y cerrar el WebSocket de voz (iba autenticado con el token anterior)
      voiceService.disconnect();
      resetVoiceWebSocketClient();
      await clearToken();
      useZustandStore.getState().resetSession();
      setState({
        isLoading: false,
        isAuthenticated: false,
        userId: null,
        error: null,
      });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during logout:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Error al cerrar sesión'
      }));
    }
  }, [router, setUserId]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    ...state,

    login,
    register,
    logout,
    checkSession,
    clearError,
  };
}
