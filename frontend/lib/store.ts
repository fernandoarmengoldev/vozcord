import { create } from "zustand";

export interface UserProfile {
  id: number;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
}

export interface AudioDevicePreferences {
  selectedInputDeviceId: string | null;
  selectedOutputDeviceId: string | null;
  selectedVideoInputDeviceId: string | null;
}

interface ZustandState {
  servidorActual: number | null;
  canalActual: number | null;
  miembrosVisible: boolean;
  dmActual: number | null;
  dmMode: boolean;
  userId: string | null;
  userProfile: UserProfile | null;
  currentChannelName: string | null;
  audioDevicePreferences: AudioDevicePreferences;
  isDeafened: boolean;
  setServidor: (s: number | null) => void;
  setCanal: (c: number) => void;
  limpiarCanal: () => void;
  setMiembrosVisible: (v: boolean) => void;
  toggleMiembros: () => void;
  setDM: (id: number) => void;
  limpiarDM: () => void;
  setDMMode: (mode: boolean) => void;
  setUserId: (id: string | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setCurrentChannelName: (name: string | null) => void;
  setAudioDevicePreferences: (prefs: AudioDevicePreferences) => void;
  setSelectedInputDevice: (deviceId: string | null) => void;
  setSelectedOutputDevice: (deviceId: string | null) => void;
  setSelectedVideoInputDevice: (deviceId: string | null) => void;
  setIsDeafened: (isDeafened: boolean) => void;
  // Limpiar el estado de sesión (logout)
  resetSession: () => void;
}

export const useZustandStore = create<ZustandState>((set) => ({
  servidorActual: null,
  canalActual: null,
  miembrosVisible: true,
  dmActual: null,
  // Al entrar se muestra el inicio (Amigos + mensajes directos), como en Discord
  dmMode: true,
  userId: null,
  userProfile: null,
  currentChannelName: null,
  audioDevicePreferences: {
    selectedInputDeviceId: null,
    selectedOutputDeviceId: null,
    selectedVideoInputDeviceId: null,
  },
  isDeafened: false,
  setServidor: (s) => set({ servidorActual: s }),
  setCanal: (c) => set({ canalActual: c }),
  limpiarCanal: () => set({ canalActual: null }),
  setMiembrosVisible: (v) => set({ miembrosVisible: v }),
  toggleMiembros: () => set((state) => ({ miembrosVisible: !state.miembrosVisible })),
  setDM: (id) => set({ dmActual: id }),
  limpiarDM: () => set({ dmActual: null }),
  setDMMode: (mode) => set({ dmMode: mode }),
  setUserId: (id) => set({ userId: id }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setCurrentChannelName: (name) => set({ currentChannelName: name }),
  setAudioDevicePreferences: (prefs) => set({ audioDevicePreferences: prefs }),
  setSelectedInputDevice: (deviceId) =>
    set((state) => ({
      audioDevicePreferences: {
        ...state.audioDevicePreferences,
        selectedInputDeviceId: deviceId,
      },
    })),
  setSelectedOutputDevice: (deviceId) =>
    set((state) => ({
      audioDevicePreferences: {
        ...state.audioDevicePreferences,
        selectedOutputDeviceId: deviceId,
      },
    })),
  setSelectedVideoInputDevice: (deviceId) =>
    set((state) => ({
      audioDevicePreferences: {
        ...state.audioDevicePreferences,
        selectedVideoInputDeviceId: deviceId,
      },
    })),
  setIsDeafened: (isDeafened) => set({ isDeafened }),
  resetSession: () =>
    set({
      servidorActual: null,
      canalActual: null,
      dmActual: null,
      dmMode: true,
      userId: null,
      userProfile: null,
      currentChannelName: null,
      isDeafened: false,
    }),
}));
