import React from 'react';
import { View, Platform } from 'react-native';
import type { PeerInfo } from '../../lib/mediasoup/types';
import { VideoTile } from './VideoTile';
import { API_URL } from '../../lib/config';

interface VideoGridProps {
  peers: Map<string, PeerInfo>;
  members?: Array<{ id: number; name: string | null; email?: string; avatarUrl?: string | null }>;
  localStream?: MediaStream;
  currentUserId?: string;
  localVideoEnabled?: boolean;
  localAudioEnabled?: boolean;
}

export function VideoGrid({ peers, members = [], localStream, currentUserId, localVideoEnabled = false, localAudioEnabled = true }: VideoGridProps) {
  // Convertir peers Map a array
  const peersArray = Array.from(peers.values());
  const totalParticipants = peersArray.length;

  // Función para obtener el nombre de un usuario
  const getUserName = (userId: string): string => {
    const member = members.find((m) => m.id.toString() === userId);
    return member?.name || member?.email || `Usuario ${userId}`;
  };

  // Función para obtener el avatar de un usuario
  const getUserAvatar = (userId: string): string | null | undefined => {
    const member = members.find((m) => m.id.toString() === userId);
    return member?.avatarUrl ? `${API_URL}${member.avatarUrl}` : null;
  };

  // Calcular el layout de la cuadrícula según el número de participantes
  const getGridLayout = () => {
    if (totalParticipants === 0) return { cols: 1, rows: 1 };
    if (totalParticipants === 1) return { cols: 1, rows: 1 };
    if (totalParticipants === 2) return { cols: 2, rows: 1 };
    if (totalParticipants <= 4) return { cols: 2, rows: 2 };
    if (totalParticipants <= 6) return { cols: 3, rows: 2 };
    if (totalParticipants <= 9) return { cols: 3, rows: 3 };
    if (totalParticipants <= 12) return { cols: 4, rows: 3 };
    if (totalParticipants <= 16) return { cols: 4, rows: 4 };
    return { cols: 5, rows: Math.ceil(totalParticipants / 5) };
  };

  const { cols, rows } = getGridLayout();

  // Estilo dinámico para cada tile basado en el número de columnas
  const getTileStyle = () => {
    // Calcular el ancho basado en el número de columnas
    const widthPercent = `${100 / cols}%`;

    return {
      // calc() solo existe en web; en nativo se usa un porcentaje con margen para el gap
      width: (Platform.OS === 'web' ? `calc(${widthPercent} - 8px)` : `${100 / cols - 2}%`) as any,
      aspectRatio: 16 / 9, // Mantener proporción 16:9
    };
  };

  return (
    <View className="w-full p-2">
      <View
        className="flex-row flex-wrap gap-2 items-start justify-center"
        style={{
          alignContent: 'flex-start',
        }}
      >
        {peersArray.map((peer) => {
          const isLocal = peer.userId === currentUserId;
          return (
            <View
              key={peer.peerId}
              style={getTileStyle()}
            >
              <VideoTile
                peer={peer}
                userName={getUserName(peer.userId)}
                avatarUrl={getUserAvatar(peer.userId)}
                isLocal={isLocal}
                localStream={isLocal ? localStream : undefined}
                videoEnabled={isLocal ? localVideoEnabled : true}
                audioEnabled={isLocal ? localAudioEnabled : true}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
