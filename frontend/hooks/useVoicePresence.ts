import { useEffect, useState, useCallback } from 'react';
import { getVoiceWebSocket } from '../lib/mediasoup/voiceWebSocket';

export type VoiceMemberWithAvatar = {
  userId: string;
  peerId: string;
  name?: string;
  avatarUrl?: string | null;
};

type VoicePresenceMap = Map<number, VoiceMemberWithAvatar[]>;

/**
 * Hook que mantiene el estado global de usuarios en canales de voz
 * Escucha eventos de WebSocket para actualizar en tiempo real
 */
export function useVoicePresence(members?: Array<{ id: number; name: string | null; email?: string; avatarUrl?: string | null }>) {
  const [voicePresence, setVoicePresence] = useState<VoicePresenceMap>(new Map());

  // Función para enriquecer un userId con datos del miembro
  const enrichMember = useCallback(
    (userId: string, peerId: string): VoiceMemberWithAvatar => {
      const member = members?.find((m) => m.id.toString() === userId);
      return {
        userId,
        peerId,
        name: member?.name || member?.email || `Usuario ${userId}`,
        avatarUrl: member?.avatarUrl,
      };
    },
    [members]
  );

  // Manejar evento peer-joined
  const handlePeerJoined = useCallback(
    (data: { channelId: string; peerId: string; userId: string }) => {
      const channelId = parseInt(data.channelId, 10);
      const enrichedMember = enrichMember(data.userId, data.peerId);

      setVoicePresence((prev) => {
        const newMap = new Map(prev);
        const currentMembers = newMap.get(channelId) || [];

        // Evitar duplicados
        const exists = currentMembers.some((m) => m.peerId === data.peerId);
        if (!exists) {
          newMap.set(channelId, [...currentMembers, enrichedMember]);
        }

        return newMap;
      });

      console.log(`Usuario ${data.userId} se unió al canal de voz ${channelId}`);
    },
    [enrichMember]
  );

  // Manejar evento peer-left
  const handlePeerLeft = useCallback(
    (data: { channelId: string; peerId: string }) => {
      const channelId = parseInt(data.channelId, 10);

      setVoicePresence((prev) => {
        const newMap = new Map(prev);
        const currentMembers = newMap.get(channelId) || [];
        const filtered = currentMembers.filter((m) => m.peerId !== data.peerId);

        if (filtered.length === 0) {
          newMap.delete(channelId);
        } else {
          newMap.set(channelId, filtered);
        }

        return newMap;
      });

      console.log(`Usuario salió del canal de voz ${channelId}`);
    },
    []
  );

  // Estado inicial al suscribirse a un servidor (antes no se veía quién estaba ya en voz)
  const handleSnapshot = useCallback(
    (data: { presence: Array<{ channelId: string; peers: Array<{ userId: string; peerId: string }> }> }) => {
      const newMap: VoicePresenceMap = new Map();
      for (const room of data.presence ?? []) {
        newMap.set(
          parseInt(room.channelId, 10),
          room.peers.map((p) => enrichMember(String(p.userId), p.peerId))
        );
      }
      setVoicePresence(newMap);
    },
    [enrichMember]
  );

  // Suscribirse a eventos de WebSocket
  useEffect(() => {
    const ws = getVoiceWebSocket();

    // Registrar callbacks
    ws.on('peer-joined', handlePeerJoined);
    ws.on('peer-left', handlePeerLeft);
    ws.on('presence-snapshot', handleSnapshot);

    return () => {
      // Limpiar callbacks al desmontar
      ws.off('peer-joined', handlePeerJoined);
      ws.off('peer-left', handlePeerLeft);
      ws.off('presence-snapshot', handleSnapshot);
    };
  }, [handlePeerJoined, handlePeerLeft, handleSnapshot]);

  // Re-enriquecer miembros cuando cambian los datos de members
  useEffect(() => {
    if (!members) return;

    setVoicePresence((prev) => {
      const newMap = new Map<number, VoiceMemberWithAvatar[]>();

      prev.forEach((memberList, channelId) => {
        const enrichedList = memberList.map((vm) => enrichMember(vm.userId, vm.peerId));
        newMap.set(channelId, enrichedList);
      });

      return newMap;
    });
  }, [members, enrichMember]);

  return voicePresence;
}
