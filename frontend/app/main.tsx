import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import type { Channel, Member, Server, VoiceMembersMap } from '../types/main.types';
import { useZustandStore } from '../lib/store';
import { useSession } from '../lib/useSession';
import { useDirectMessages } from '../hooks/useDirectMessages';
import { useVoice } from '../lib/useVoice';
import { useVoicePresence } from '../hooks/useVoicePresence';
import { apiFetch } from '../lib/api';
import { getVoiceWebSocketClient } from '../lib/mediasoup/voiceWebSocket';
import CompactLayout from '../components/main/CompactLayout';
import DesktopLayout from '../components/main/DesktopLayout';
import { RemoteAudio } from '../components/channels/RemoteAudio';

export default function Servers() {
  const router = useRouter();
  const { isLoading, isAuthenticated, logout } = useSession();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;

  const {
    servidorActual,
    canalActual,
    setServidor,
    setCanal,
    limpiarCanal,
    limpiarDM,
    setMiembrosVisible,
    setCurrentChannelName,
    setDMMode,
  } = useZustandStore();

  const { peers } = useVoice();

  // Redirigir a login si no hay sesión activa
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Datos de la aplicación
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Estado global de presencia en canales de voz (con WebSocket)
  const voicePresence = useVoicePresence(members);

  // Estados de carga
  const [loadingServers, setLoadingServers] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Obtener el servidor y canal actuales
  const currentServer = useMemo(
    () => servers.find((s) => s.id === servidorActual) ?? null,
    [servers, servidorActual]
  );

  const currentChannel = useMemo(
    () => channels.find((c) => c.id === canalActual) ?? null,
    [channels, canalActual]
  );

  // Actualizar nombre del canal en el store
  useEffect(() => {
    if (currentChannel) {
      setCurrentChannelName(currentChannel.name);
    } else {
      setCurrentChannelName(null);
    }
  }, [currentChannel, setCurrentChannelName]);

  // Combinar voicePresence con peers actuales para el canal en el que estamos
  const voiceMembers: VoiceMembersMap = useMemo(() => {
    const combined = new Map(voicePresence);

    // Si estamos en un canal de voz y tenemos peers, asegurarnos de que estén en el mapa
    if (canalActual && currentChannel?.type === 'voice' && peers.size > 0) {
      const peersList = Array.from(peers.values());
      const currentMembers = combined.get(canalActual) || [];

      // Crear un set de peerIds existentes
      const existingPeerIds = new Set(currentMembers.map((m) => m.peerId));

      // Agregar peers que falten
      peersList.forEach((peer) => {
        if (!existingPeerIds.has(peer.peerId)) {
          const member = members.find((m) => m.id.toString() === peer.userId);
          currentMembers.push({
            userId: peer.userId,
            peerId: peer.peerId,
            name: member?.name || member?.email || `Usuario ${peer.userId}`,
            avatarUrl: member?.avatarUrl,
          });
        }
      });

      if (currentMembers.length > 0) {
        combined.set(canalActual, currentMembers);
      }
    }

    return combined;
  }, [canalActual, currentChannel, peers, voicePresence, members]);

  // Cargar servidores (antes se recargaba la lista entera cada vez que cambiabas de servidor)
  const loadServers = useCallback(async () => {
    setLoadingServers(true);
    try {
      const res = await apiFetch('/servers', { method: 'GET', auth: true });
      if (res.ok) {
        const data = (await res.json()) as { servers: Server[] };
        const list = data.servers ?? [];
        setServers(list);
        // Ya no se entra automáticamente en el primer servidor: por defecto se muestra el inicio.
        // Si el servidor guardado ya no existe (p. ej. lo han borrado), volver al inicio.
        const current = useZustandStore.getState().servidorActual;
        if (current && !list.some((s) => s.id === current)) {
          setServidor(null);
          limpiarCanal();
          setDMMode(true);
        }
      }
    } finally {
      setLoadingServers(false);
    }
  }, [setServidor, limpiarCanal, setDMMode]);

  useEffect(() => {
    if (isAuthenticated) loadServers();
  }, [isAuthenticated, loadServers]);

  // Recargar miembros del servidor actual (p. ej. tras añadir uno)
  const loadMembers = useCallback(async () => {
    if (!servidorActual) return;
    const resMembers = await apiFetch(`/servers/${servidorActual}/members`, {
      method: 'GET',
      auth: true,
    });
    if (resMembers.ok) {
      const data = (await resMembers.json()) as { members: Member[] };
      setMembers(data.members ?? []);
    }
  }, [servidorActual]);

  // Diseño responsivo: ocultar barra de miembros en modo compacto
  useEffect(() => {
    if (isCompact) {
      setMiembrosVisible(false);
    }
  }, [isCompact, setMiembrosVisible]);

  // Cargar canales y miembros cuando cambia el servidor
  useEffect(() => {
    const loadChannels = async () => {
      if (!servidorActual) {
        setChannels([]);
        setMembers([]);
        return;
      }
      setLoadingChannels(true);
      try {
        const res = await apiFetch(`/servers/${servidorActual}/channels`, {
          method: 'GET',
          auth: true,
        });
        if (res.ok) {
          const data = (await res.json()) as { channels: Channel[] };
          const list = data.channels ?? [];
          setChannels(list);
          const first = list[0];
          if (first && !useZustandStore.getState().canalActual) {
            setCanal(first.id);
          }
        } else {
          setChannels([]);
        }

        const resMembers = await apiFetch(`/servers/${servidorActual}/members`, {
          method: 'GET',
          auth: true,
        });
        if (resMembers.ok) {
          const data = (await resMembers.json()) as { members: Member[] };
          setMembers(data.members ?? []);
        } else {
          setMembers([]);
        }
      } finally {
        setLoadingChannels(false);
      }
    };
    loadChannels();

    return () => {
      setChannels([]);
      setMembers([]);
    };
  }, [servidorActual]);

  // Suscribirse a eventos de presencia del servidor actual
  useEffect(() => {
    if (!servidorActual) return;

    // request() conecta y autentica si hace falta; tras una reconexión el cliente
    // vuelve a suscribirse solo y recibe el estado actual de los canales de voz
    getVoiceWebSocketClient()
      .subscribeToServer(servidorActual)
      .catch((error) => console.error('Error suscribiéndose a presencia del servidor:', error));
  }, [servidorActual]);

  // Handlers para crear servidores y canales
  const handleCreateServer = async (name: string, imageUri: string) => {
    try {
      // Create FormData to send image
      const formData = new FormData();
      formData.append('name', name);

      // Add image file
      const filename = imageUri.split('/').pop() || 'server-icon.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // For web, we need to fetch the blob first
      // For native, we can use the uri directly
      const isWeb = Platform.OS === 'web';

      if (isWeb) {
        // Web: fetch the blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('icon', blob, filename);
      } else {
        // Native: use uri object format
        formData.append('icon', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const res = await apiFetch('/servers', {
        method: 'POST',
        auth: true,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Error al crear el servidor');
      }

      const data = (await res.json()) as { server: Server };
      setServers((prev) => [...prev, data.server]);
      setServidor(data.server.id);
      limpiarCanal();
      limpiarDM();
      setDMMode(false);
    } catch (error) {
      console.error('Error creating server:', error);
      throw error;
    }
  };

  const handleCreateChannel = async (name: string, type: 'text' | 'voice') => {
    if (!servidorActual) return;

    const res = await apiFetch(`/servers/${servidorActual}/channels`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ name, type }),
    });

    if (res.ok) {
      const data = (await res.json()) as { channel: Channel };
      setChannels((prev) => [...prev, data.channel]);
      setCanal(data.channel.id);
    }
  };

  const {
    conversations,
    handleStartDM,
    handleDMPress,
    handleConversationSelect,
  } = useDirectMessages();

  const startDM = async (userId: number) => {
    try {
      await handleStartDM(userId);
    } catch (error) {
      console.error('Error starting DM:', error);
      alert('Error al iniciar conversación');
    }
  };

  const handleServerSelect = (id: number) => {
    // Si vuelves al mismo servidor se mantiene el último canal abierto
    if (id !== servidorActual) limpiarCanal();
    setServidor(id);
    limpiarDM();
    setDMMode(false);
  };

  // Sin servidor seleccionado no hay canales que mostrar: forzar el inicio
  useEffect(() => {
    if (!servidorActual && !useZustandStore.getState().dmMode) {
      setDMMode(true);
    }
  }, [servidorActual, setDMMode]);

  const handleChannelSelect = (id: number) => {
    const channel = channels.find((c) => c.id === id);
    if (channel) {
      useZustandStore.getState().setCanal(id);
    }
  };

  const handleServerDelete = (serverId: number) => {
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    if (currentServer?.id === serverId) {
      // Volver al inicio en lugar de saltar a otro servidor
      setServidor(null);
      limpiarCanal();
      setDMMode(true);
    }
  };

  const handleChannelDelete = (channelId: number) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (currentChannel?.id === channelId) {
      limpiarCanal();
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-bg-primary">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Audio de la llamada: se sigue oyendo aunque cambies de canal o vayas al inicio */}
      <RemoteAudio />
      <View className="flex-1">
        {isCompact ? (
          <CompactLayout
            servers={servers}
            channels={channels}
            members={members}
            conversations={conversations}
            currentServer={currentServer}
            currentChannel={currentChannel}
            voiceMembers={voiceMembers}
            onServerSelect={handleServerSelect}
            onChannelSelect={handleChannelSelect}
            onConversationSelect={handleConversationSelect}
            onServerCreate={handleCreateServer}
            onServerDelete={handleServerDelete}
            onChannelCreate={handleCreateChannel}
            onChannelDelete={handleChannelDelete}
            onDMPress={handleDMPress}
            onStartDM={startDM}
            onServerUpdate={loadServers}
            onMemberAdded={loadMembers}
            onLogout={logout}
          />
        ) : (
          <DesktopLayout
            servers={servers}
            channels={channels}
            members={members}
            conversations={conversations}
            currentServer={currentServer}
            currentChannel={currentChannel}
            voiceMembers={voiceMembers}
            onServerSelect={handleServerSelect}
            onChannelSelect={handleChannelSelect}
            onConversationSelect={handleConversationSelect}
            onServerCreate={handleCreateServer}
            onServerDelete={handleServerDelete}
            onChannelCreate={handleCreateChannel}
            onChannelDelete={handleChannelDelete}
            onDMPress={handleDMPress}
            onStartDM={startDM}
            onServerUpdate={loadServers}
            onMemberAdded={loadMembers}
            onLogout={logout}
          />
        )}
      </View>
    </View>
  );
}
