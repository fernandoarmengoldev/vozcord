import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { PeerInfo } from '../../lib/mediasoup/types';
import { UserAvatar } from '../common/UserAvatar';
import { MicOffIcon, VideoOffIcon } from '../common/Icons';
import { useZustandStore } from '../../lib/store';

interface VideoTileProps {
  peer: PeerInfo;
  userName: string;
  avatarUrl?: string | null;
  isLocal?: boolean;
  localStream?: MediaStream;
  videoEnabled?: boolean;
  // Solo para el tile local: estado de mute del micrófono
  audioEnabled?: boolean;
}

/**
 * Versión React Native de VideoTile.
 * La versión web usa <video>/<audio> del DOM, que no existen en nativo.
 * Aquí el vídeo se pinta con RTCView y el audio remoto lo reproduce
 * react-native-webrtc automáticamente (no hace falta ningún elemento).
 */
export function VideoTile({ peer, userName, avatarUrl, isLocal = false, localStream, videoEnabled = true, audioEnabled = true }: VideoTileProps) {
  const isDeafened = useZustandStore((state) => state.isDeafened);

  const videoStream = isLocal ? localStream : peer.videoStream;
  const hasVideo = !!videoStream?.getVideoTracks().length && !(!isLocal && peer.videoPaused);
  const hasAudio = isLocal
    ? !!localStream?.getAudioTracks().length && audioEnabled
    : !!peer.audioStream && !peer.audioPaused;
  const shouldShowVideo = hasVideo && videoEnabled;

  // Ensordecer: deshabilitar los tracks de audio remotos
  useEffect(() => {
    if (isLocal) return;
    peer.audioStream?.getAudioTracks().forEach((track) => {
      track.enabled = !isDeafened;
    });
  }, [peer.audioStream, isDeafened, isLocal]);

  return (
    <View className="relative w-full h-full bg-dark-bg-elevated rounded-lg overflow-hidden border border-dark-border-subtle">
      {shouldShowVideo && videoStream ? (
        <RTCView
          streamURL={(videoStream as any).toURL()}
          objectFit="cover"
          mirror={isLocal}
          style={{ flex: 1 }}
        />
      ) : (
        <View className="w-full h-full items-center justify-center">
          <UserAvatar avatarUrl={avatarUrl} size={64} fallbackText={userName} fallbackColor="#60a5fa" />
        </View>
      )}

      <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            {userName} {isLocal && '(Tú)'}
          </Text>
          <View className="flex-row gap-2">
            {!hasAudio && (
              <View className="bg-red-500/90 rounded-full p-1.5">
                <MicOffIcon size={14} color="#fff" />
              </View>
            )}
            {!shouldShowVideo && (
              <View className="bg-red-500/90 rounded-full p-1.5">
                <VideoOffIcon size={14} color="#fff" />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
